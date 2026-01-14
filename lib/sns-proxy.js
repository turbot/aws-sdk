/**
 * SNS v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported methods:
 * - publish, subscribe, createTopic, deleteTopic
 * - setTopicAttributes, getTopicAttributes, tagResource, listTopics
 */

const {
  SNSClient,
  PublishCommand,
  SubscribeCommand,
  CreateTopicCommand,
  DeleteTopicCommand,
  SetTopicAttributesCommand,
  GetTopicAttributesCommand,
  TagResourceCommand,
  ListTopicsCommand,
} = require("@aws-sdk/client-sns");

function normalizeError(err) {
  if (err && !err.code && err.name) {
    err.code = err.name;
  }
  return err;
}

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

function createSNSProxy(config) {
  const client = new SNSClient(config);

  const proxy = {
    _client: client,
    _config: config,

    publish(params, callback) {
      const promise = client.send(new PublishCommand(params));
      return createRequest(promise, callback);
    },

    subscribe(params, callback) {
      const promise = client.send(new SubscribeCommand(params));
      return createRequest(promise, callback);
    },

    createTopic(params, callback) {
      const promise = client.send(new CreateTopicCommand(params));
      return createRequest(promise, callback);
    },

    deleteTopic(params, callback) {
      const promise = client.send(new DeleteTopicCommand(params));
      return createRequest(promise, callback);
    },

    setTopicAttributes(params, callback) {
      const promise = client.send(new SetTopicAttributesCommand(params));
      return createRequest(promise, callback);
    },

    getTopicAttributes(params, callback) {
      const promise = client.send(new GetTopicAttributesCommand(params));
      return createRequest(promise, callback);
    },

    tagResource(params, callback) {
      const promise = client.send(new TagResourceCommand(params));
      return createRequest(promise, callback);
    },

    listTopics(params, callback) {
      const promise = client.send(new ListTopicsCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createSNSProxy,
};
