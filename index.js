const _ = require("lodash");
const errors = require("@turbot/errors");
const localstackServices = require("./localstack-services");
const log = require("@turbot/log");
const micromatch = require("micromatch");
const pa = require("proxy-agent");
const tconf = require("@turbot/config");
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
const proxyAgent = function(serviceKey) {
  const awsProxy = _.cloneDeep(tconf.get(["aws", "proxy"], {}));
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
    log.error(errors.badConfiguration("Invalid URL configuration in aws.proxy.https_proxy", e));
    return null;
  }
  return pa(proxyObj.href);
};

const localEndpoint = function(serviceKey) {
  if (localstackServices[serviceKey].localPort) {
    return "http://localhost:" + localstackServices[serviceKey].localPort;
  }
  throw errors.notImplemented(`No local endpoint available for testing AWS Service "${serviceKey}"`);
};

const connect = function(serviceKey, params, opts = {}) {
  let aws;

  if (process.env.TURBOT_TRACE === "true" || opts.trace) {
    const xray = require("@turbot/xray");
    aws = xray.captureAWS(require("aws-sdk"));

    // This is not working as I had expected, no metadata is recorded

    // if (opts.xrayMetadata) {
    //   const segment = xray.getSegment();
    //   Object.keys(opts.xrayMetadata).forEach(key => {
    //     console.log(">>>>> adding XRay metadata: ", key, JSON.stringify(opts.xrayMetadata[key]));
    //     segment.addMetadata(key, JSON.stringify(opts.xrayMetadata[key]));
    //   });
    // }
  } else {
    aws = require("aws-sdk");
  }

  // Development hack
  if (process.env.NODE_ENV === "local-development") {
    const credentials = new aws.SharedIniFileCredentials({ profile: process.env.TURBOT_DEV_PROFILE });
    aws.config.credentials = credentials;
    aws.config.region = process.env.TURBOT_DEV_MASTER_REGION;
  }

  if (!params) params = {};

  // If they have a proxy, configure the agent.
  let proxy = proxyAgent(serviceKey);
  if (proxy) {
    params.httpOptions = {
      agent: proxy
    };
  }

  // If they have signalled test mode, then try connecting to a localstack
  // endpoint.
  if (tconf.get(["aws", "test"])) {
    params.endpoint = localEndpoint(serviceKey);
  }

  if (!params.region) {
    // env.region defaults to environment in turbot-config
    // default to the AWS_REGION env var
    params.region = tconf.get(["env", "region"], process.env.AWS_REGION);
  }

  // We always default to the best practice v4 unless otherwise specified.
  if (!params.signatureVersion) {
    params.signatureVersion = "v4";
  }
  return new aws[serviceKey](params);
};

const initialize = function() {
  const servicePoints = { connect };
  const aws = require("aws-sdk");
  for (const k of Object.keys(aws)) {
    servicePoints[k.toLowerCase()] = function() {
      return connect(k, ...arguments);
    };
  }
  return servicePoints;
};

module.exports = initialize();
