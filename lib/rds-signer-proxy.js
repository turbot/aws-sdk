/**
 * RDS.Signer v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * CRITICAL: v3 Signer only returns promises, so we wrap with callback support.
 *
 * Supported patterns:
 * 1. Callback: signer.getAuthToken(params, (err, token) => {})
 * 2. Promise:  signer.getAuthToken(params).promise()
 *
 * Supported methods:
 * - getAuthToken
 */

const { Signer } = require("@aws-sdk/rds-signer");

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
 * Create an RDS.Signer proxy instance that wraps v3 Signer with v2-compatible API.
 *
 * @param {Object} config - Signer configuration (region, hostname, port, username, credentials)
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createRDSSignerProxy(config) {
  // Store config for creating Signer instances
  // Note: v3 Signer takes config per-call or at construction
  const proxy = {
    _config: config,

    /**
     * getAuthToken - Generate an IAM authentication token for RDS
     *
     * v2: signer.getAuthToken(params, callback) or signer.getAuthToken(params).promise()
     * v3: signer.getAuthToken() returns Promise<string>
     *
     * @param {Object} params - Optional params (hostname, port, username can override config)
     * @param {Function} callback - Optional callback (err, token)
     */
    getAuthToken(params, callback) {
      // Handle case where params is actually the callback (v2 compatibility)
      if (typeof params === "function") {
        callback = params;
        params = {};
      }

      // Merge params with config (params override config)
      const signerConfig = {
        region: params.region || config.region,
        hostname: params.hostname || config.hostname,
        port: params.port || config.port,
        username: params.username || config.username,
      };

      // Add credentials if provided
      if (config.credentials) {
        signerConfig.credentials = config.credentials;
      }

      // Create signer and get token
      const signer = new Signer(signerConfig);
      const promise = signer.getAuthToken();

      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createRDSSignerProxy,
};
