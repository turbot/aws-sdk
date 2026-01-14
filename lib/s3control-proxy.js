/**
 * S3Control v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported patterns:
 * 1. Callback: s3control.getPublicAccessBlock(params, (err, data) => {})
 * 2. Promise:  s3control.getPublicAccessBlock(params).promise()
 *
 * Supported methods:
 * - getPublicAccessBlock
 */

const {
  S3ControlClient,
  GetPublicAccessBlockCommand,
} = require("@aws-sdk/client-s3-control");

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
 * Create an S3Control proxy instance that wraps v3 client with v2-compatible API.
 */
function createS3ControlProxy(config) {
  const client = new S3ControlClient(config);

  const proxy = {
    _client: client,
    _config: config,

    /**
     * getPublicAccessBlock - Get public access block configuration for an account
     */
    getPublicAccessBlock(params, callback) {
      const promise = client.send(new GetPublicAccessBlockCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createS3ControlProxy,
};
