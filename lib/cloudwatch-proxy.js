/**
 * CloudWatch v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported patterns:
 * 1. Callback: cloudwatch.getMetricStatistics(params, (err, data) => {})
 * 2. Promise:  cloudwatch.getMetricStatistics(params).promise()
 *
 * Supported methods:
 * - getMetricStatistics
 */

const {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} = require("@aws-sdk/client-cloudwatch");

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
 * Create a CloudWatch proxy instance that wraps v3 client with v2-compatible API.
 */
function createCloudWatchProxy(config) {
  const client = new CloudWatchClient(config);

  const proxy = {
    _client: client,
    _config: config,

    /**
     * getMetricStatistics - Get statistics for a metric
     */
    getMetricStatistics(params, callback) {
      const promise = client.send(new GetMetricStatisticsCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createCloudWatchProxy,
};
