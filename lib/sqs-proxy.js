/**
 * SQS v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: sqs.getQueueUrl(params, (err, data) => {})
 * 2. Promise:  sqs.getQueueUrl(params).promise()
 *
 * Supported methods:
 * - getQueueUrl, getQueueAttributes, setQueueAttributes, removePermission, listQueues
 * - sendMessage, changeMessageVisibility
 */

const {
  SQSClient,
  GetQueueUrlCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
  RemovePermissionCommand,
  ListQueuesCommand,
  SendMessageCommand,
  ChangeMessageVisibilityCommand,
} = require("@aws-sdk/client-sqs");

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
 * Create an SQS proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - SQS client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createSQSProxy(config) {
  const client = new SQSClient(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * getQueueUrl - Get the URL of an SQS queue
     *
     * v2: sqs.getQueueUrl(params, callback) or sqs.getQueueUrl(params).promise()
     */
    getQueueUrl(params, callback) {
      const promise = client.send(new GetQueueUrlCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * getQueueAttributes - Get attributes of an SQS queue
     *
     * v2: sqs.getQueueAttributes(params, callback) or sqs.getQueueAttributes(params).promise()
     */
    getQueueAttributes(params, callback) {
      const promise = client.send(new GetQueueAttributesCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * setQueueAttributes - Set attributes of an SQS queue
     *
     * v2: sqs.setQueueAttributes(params, callback) or sqs.setQueueAttributes(params).promise()
     */
    setQueueAttributes(params, callback) {
      const promise = client.send(new SetQueueAttributesCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * removePermission - Remove a permission from an SQS queue
     *
     * v2: sqs.removePermission(params, callback) or sqs.removePermission(params).promise()
     */
    removePermission(params, callback) {
      const promise = client.send(new RemovePermissionCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * listQueues - List SQS queues
     *
     * v2: sqs.listQueues(params, callback) or sqs.listQueues(params).promise()
     */
    listQueues(params, callback) {
      const promise = client.send(new ListQueuesCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * sendMessage - Send a message to an SQS queue
     *
     * v2: sqs.sendMessage(params, callback) or sqs.sendMessage(params).promise()
     */
    sendMessage(params, callback) {
      const promise = client.send(new SendMessageCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * changeMessageVisibility - Change the visibility timeout of a message
     *
     * v2: sqs.changeMessageVisibility(params, callback) or sqs.changeMessageVisibility(params).promise()
     */
    changeMessageVisibility(params, callback) {
      const promise = client.send(new ChangeMessageVisibilityCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createSQSProxy,
};
