/**
 * SES v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: ses.sendEmail(params, (err, data) => {})
 * 2. Promise:  ses.sendEmail(params).promise()
 *
 * Supported methods:
 * - sendEmail
 */

const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

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
 *
 * @param {Promise} promise - The v3 promise to wrap
 * @param {Function} callback - Optional callback for callback-style usage
 * @returns {Object} - Object with .promise() method
 */
function createRequest(promise, callback) {
  // Wrap the promise to normalize errors (add .code for v2 compatibility)
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
 * Create an SES proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - SES client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createSESProxy(config) {
  const client = new SESClient(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * sendEmail - Send an email
     *
     * v2: ses.sendEmail(params, callback) or ses.sendEmail(params).promise()
     */
    sendEmail(params, callback) {
      const promise = client.send(new SendEmailCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createSESProxy,
};
