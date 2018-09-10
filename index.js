const _ = require("lodash");
const errors = require("@turbot/errors");
const log = require("@turbot/log");
const micromatch = require("micromatch");
const pa = require("proxy-agent");
const { URL } = require("url");

// AWS SDK requires the use of proxy-agent. Unfortunately it's very limited
// to the point where it doesn't support either environment variables and has
// no way to configure no_proxy settings.
// In addition, AWS services are complex since there are so many regional
// endpoints to match. This makes service specific proxies very difficult to
// set.
// So, instead we have configuration options to either explicitly enable or
// disable the proxy per AWS service. These are wildcard string lists, designed
// to match the service names. The match is case insensitive.
// The https_proxy will be enabled if:
//   1. The https_proxy is configured.
//   2. None of aws.proxy.disabled strings match the service name (case insensitive).
//   3. Any of the aws.proxy.enabled strings match the service name.
// The default values are:
//   aws.https_proxy = process.env.https_proxy || process.env.HTTPS_PROXY
//   aws.proxy.enabled = ['*']
//   aws.proxy.disabled = []

const proxyAgent = function(serviceKey, turbotConfig) {
  let awsProxy = _.get(turbotConfig, "aws.proxy");
  if (awsProxy) {
    awsProxy = _.cloneDeep(awsProxy);
  } else {
    awsProxy = {};
  }

  _.defaults(awsProxy, {
    https_proxy: process.env.https_proxy || process.env.HTTPS_PROXY,
    enabled: ["*"],
    disabled: []
  });
  // If there is no proxy defined, we have nothing to do.
  if (!awsProxy.https_proxy) {
    return null;
  }
  // PRE: There is a proxy.
  let serviceLower = serviceKey.toLowerCase();
  let disabledServices = awsProxy.disabled.map(i => {
    return i.toLowerCase();
  });
  // If the service matches any of the disabled wildcards then the proxy should
  // be disabled.
  if (micromatch.any(serviceLower, disabledServices)) {
    return null;
  }
  // PRE: The proxy is not explicitly disabled.
  let enabledServices = awsProxy.enabled.map(i => {
    return i.toLowerCase();
  });
  // If not enabled, then no proxy.
  if (!micromatch.any(serviceLower, enabledServices)) {
    return null;
  }
  // PRE: Proxy should be enabled for this service
  // The https_proxy MUST be a valid URL. It's not valid or appropriate to pass
  // a straight domain name here. (This is in contrast to no_proxy, where a domain
  // name only is a valid setting.)
  let proxyObj;
  try {
    proxyObj = new URL(awsProxy.https_proxy);
  } catch (e) {
    // Do not throw an error here. That would cause all connection attempts to
    // AWS to fail at scale, leaving Turbot inoperable.
    // Instead, log the error and continue with no proxy. That may not work
    // either, but is better than a bad configuration locking us out completely.
    log.error(errors.badConfiguration("Invalid URL configuration in aws.proxy.https_proxy", { error: e }));
    return null;
  }
  return pa(proxyObj.href);
};

const connect = function(serviceKey, params, opts = {}) {
  // Parse env variable ourselves because we have issues with @turbot/config + npm + git
  // npm believe each @turbot/config is a separate version and therefore it's loaded multiple times
  let turbotConfig = {};
  if (process.env.TURBOT_CONFIG_ENV) {
    try {
      log.debug("Parsing TURBOT_CONFIG_ENV", process.env.TURBOT_CONFIG_ENV);
      turbotConfig = JSON.parse(process.env.TURBOT_CONFIG_ENV);
    } catch (e) {
      log.error("Error setting proxy server for aws-sdk", e);
      turbotConfig = {};
    }
  }

  let aws;

  if (process.env.TURBOT_TRACE === "true" || opts.trace) {
    const xray = require("@turbot/xray");
    aws = xray.captureAWS(require("aws-sdk"));
  } else {
    aws = require("aws-sdk");
  }

  // Development or test setup to record VCR cassetttes
  if (process.env.NODE_ENV === "local-development") {
    if (process.env.TURBOT_DEV_PROFILE) {
      const credentials = new aws.SharedIniFileCredentials({ profile: process.env.TURBOT_DEV_PROFILE });
      aws.config.credentials = credentials;
    }
    if (process.env.TURBOT_DEV_MASTER_REGION) {
      aws.config.region = process.env.TURBOT_DEV_MASTER_REGION;
    }
  }

  if (!params) params = {};

  if (process.env.TURBOT_CONTROL_AWS_CREDENTIALS) {
    try {
      log.debug("Parsing TURBOT_CONTROL_AWS_CREDENTIALS", process.env.TURBOT_CONTROL_AWS_CREDENTIALS);
      const creds = JSON.parse(process.env.TURBOT_CONTROL_AWS_CREDENTIALS);
      log.debug("Setting params.credentials to", { credentials: creds });
      params.credentials = creds;
    } catch (e) {
      log.error("Error parsing TURBOT_CONTROL_AWS_CREDENTIALS, credentials not stored", { error: e });
    }
  }

  // If running in Lambda setup, set the default region based on the:
  // https://docs.aws.amazon.com/lambda/latest/dg/current-supported-versions.html
  // AWS_DEFAULT_REGION is the first preference
  if (!params.region) {
    params.region = process.env.AWS_DEFAULT_REGION;
    if (!params.region) {
      params.region = process.env.TURBOT_CONTROL_AWS_REGION;
      if (!params.region) {
        params.region = _.get(turbotConfig, "env.region");
      }
    }
  }

  // If they have a proxy, configure the agent.
  let proxy = proxyAgent(serviceKey, turbotConfig);
  if (proxy) {
    params.httpOptions = {
      agent: proxy
    };
  }

  // We always default to the best practice v4 unless otherwise specified.
  if (!params.signatureVersion) {
    params.signatureVersion = "v4";
  }

  log.debug("Instantiating service", { serviceKey: serviceKey, params: params });
  return new aws[serviceKey](params);
};

module.exports = {
  connect
};

// const initialize = function() {
//   const servicePoints = { connect };
//   const aws = require("aws-sdk");
//   for (const k of Object.keys(aws)) {
//     servicePoints[k.toLowerCase()] = function() {
//       return connect(k, ...arguments);
//     };
//   }
//   return servicePoints;
// };

// module.exports = initialize();
