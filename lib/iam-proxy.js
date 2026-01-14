/**
 * IAM v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: iam.listUsers(params, (err, data) => {})
 * 2. Promise:  iam.listUsers(params).promise()
 *
 * Supported methods:
 * - createAccessKey, deleteAccessKey, updateAccessKey, listUsers
 */

const {
  IAMClient,
  CreateAccessKeyCommand,
  DeleteAccessKeyCommand,
  UpdateAccessKeyCommand,
  ListUsersCommand,
} = require("@aws-sdk/client-iam");

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
 * Create an IAM proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - IAM client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createIAMProxy(config) {
  const client = new IAMClient(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * createAccessKey - Create a new access key for a user
     *
     * v2: iam.createAccessKey(params, callback) or iam.createAccessKey(params).promise()
     */
    createAccessKey(params, callback) {
      const promise = client.send(new CreateAccessKeyCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteAccessKey - Delete an access key
     *
     * v2: iam.deleteAccessKey(params, callback) or iam.deleteAccessKey(params).promise()
     */
    deleteAccessKey(params, callback) {
      const promise = client.send(new DeleteAccessKeyCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * updateAccessKey - Update an access key's status
     *
     * v2: iam.updateAccessKey(params, callback) or iam.updateAccessKey(params).promise()
     */
    updateAccessKey(params, callback) {
      const promise = client.send(new UpdateAccessKeyCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * listUsers - List IAM users
     *
     * v2: iam.listUsers(params, callback) or iam.listUsers(params).promise()
     */
    listUsers(params, callback) {
      const promise = client.send(new ListUsersCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createIAMProxy,
};
