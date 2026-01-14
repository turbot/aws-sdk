/**
 * EC2 v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported patterns:
 * 1. Callback: ec2.describeAccountAttributes(params, (err, data) => {})
 * 2. Promise:  ec2.describeAccountAttributes(params).promise()
 *
 * Supported methods:
 * - describeAccountAttributes
 */

const {
  EC2Client,
  DescribeAccountAttributesCommand,
} = require("@aws-sdk/client-ec2");

/**
 * Normalize errors from v3 to v2 format.
 * v2 uses err.code, v3 uses err.name
 */
function normalizeError(err) {
  if (err && !err.code && err.name) {
    err.code = err.name;
  }
  return err;
}

/**
 * Create a v2-compatible request object that supports both callback and promise patterns.
 */
function createRequest(promise, callback) {
  const normalizedPromise = promise.catch((err) => {
    throw normalizeError(err);
  });

  if (callback) {
    normalizedPromise.then((data) => callback(null, data)).catch((err) => callback(err));
  }

  return {
    promise: () => normalizedPromise,
  };
}

/**
 * Create an EC2 proxy instance that wraps v3 client with v2-compatible API.
 */
function createEC2Proxy(config) {
  const client = new EC2Client(config);

  const proxy = {
    _client: client,
    _config: config,

    /**
     * describeAccountAttributes - Describe account-level attributes
     */
    describeAccountAttributes(params, callback) {
      const promise = client.send(new DescribeAccountAttributesCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createEC2Proxy,
};
