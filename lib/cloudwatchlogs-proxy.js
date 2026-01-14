/**
 * CloudWatchLogs v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported patterns:
 * 1. Callback: logs.describeLogStreams(params, (err, data) => {})
 * 2. Promise:  logs.describeLogStreams(params).promise()
 *
 * Supported methods:
 * - describeLogStreams, createLogStream, putLogEvents, describeDestinations
 */

const {
  CloudWatchLogsClient,
  DescribeLogStreamsCommand,
  CreateLogStreamCommand,
  PutLogEventsCommand,
  DescribeDestinationsCommand,
} = require("@aws-sdk/client-cloudwatch-logs");

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
 * Create a CloudWatchLogs proxy instance that wraps v3 client with v2-compatible API.
 */
function createCloudWatchLogsProxy(config) {
  const client = new CloudWatchLogsClient(config);

  const proxy = {
    _client: client,
    _config: config,

    /**
     * describeLogStreams - List log streams in a log group
     */
    describeLogStreams(params, callback) {
      const promise = client.send(new DescribeLogStreamsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * createLogStream - Create a log stream in a log group
     */
    createLogStream(params, callback) {
      const promise = client.send(new CreateLogStreamCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * putLogEvents - Upload log events to a log stream
     */
    putLogEvents(params, callback) {
      const promise = client.send(new PutLogEventsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeDestinations - List destinations for cross-account log delivery
     */
    describeDestinations(params, callback) {
      const promise = client.send(new DescribeDestinationsCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createCloudWatchLogsProxy,
};
