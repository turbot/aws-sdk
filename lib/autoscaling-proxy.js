/**
 * AutoScaling v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported patterns:
 * 1. Callback: autoscaling.completeLifecycleAction(params, (err, data) => {})
 * 2. Promise:  autoscaling.completeLifecycleAction(params).promise()
 *
 * Supported methods:
 * - completeLifecycleAction
 */

const {
  AutoScalingClient,
  CompleteLifecycleActionCommand,
} = require("@aws-sdk/client-auto-scaling");

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
 * Create an AutoScaling proxy instance that wraps v3 client with v2-compatible API.
 */
function createAutoScalingProxy(config) {
  const client = new AutoScalingClient(config);

  const proxy = {
    _client: client,
    _config: config,

    /**
     * completeLifecycleAction - Complete a lifecycle action for an instance
     */
    completeLifecycleAction(params, callback) {
      const promise = client.send(new CompleteLifecycleActionCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createAutoScalingProxy,
};
