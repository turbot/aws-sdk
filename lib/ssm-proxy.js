/**
 * SSM v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: ssm.getParameter(params, (err, data) => {})
 * 2. Promise:  ssm.getParameter(params).promise()
 *
 * Supported methods:
 * - getParameter, getParameters, getParametersByPath
 * - putParameter, deleteParameter, addTagsToResource
 */

const {
  SSMClient,
  GetParameterCommand,
  GetParametersCommand,
  GetParametersByPathCommand,
  PutParameterCommand,
  DeleteParameterCommand,
  AddTagsToResourceCommand,
} = require("@aws-sdk/client-ssm");

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
 * Create an SSM proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - SSM client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createSSMProxy(config) {
  const client = new SSMClient(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * getParameter - Retrieve a single parameter from Parameter Store
     *
     * v2: ssm.getParameter(params, callback) or ssm.getParameter(params).promise()
     */
    getParameter(params, callback) {
      const promise = client.send(new GetParameterCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * getParameters - Retrieve multiple parameters by name
     *
     * v2: ssm.getParameters(params, callback) or ssm.getParameters(params).promise()
     */
    getParameters(params, callback) {
      const promise = client.send(new GetParametersCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * getParametersByPath - Retrieve parameters by path prefix
     *
     * v2: ssm.getParametersByPath(params, callback) or ssm.getParametersByPath(params).promise()
     */
    getParametersByPath(params, callback) {
      const promise = client.send(new GetParametersByPathCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * putParameter - Create or update a parameter in Parameter Store
     *
     * v2: ssm.putParameter(params, callback) or ssm.putParameter(params).promise()
     */
    putParameter(params, callback) {
      const promise = client.send(new PutParameterCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteParameter - Delete a parameter from Parameter Store
     *
     * v2: ssm.deleteParameter(params, callback) or ssm.deleteParameter(params).promise()
     */
    deleteParameter(params, callback) {
      const promise = client.send(new DeleteParameterCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * addTagsToResource - Add tags to an SSM resource (parameter, document, etc.)
     *
     * v2: ssm.addTagsToResource(params, callback) or ssm.addTagsToResource(params).promise()
     */
    addTagsToResource(params, callback) {
      const promise = client.send(new AddTagsToResourceCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createSSMProxy,
};
