/**
 * STS v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported methods:
 * - assumeRole, getCallerIdentity, getFederationToken
 */

const {
  STSClient,
  AssumeRoleCommand,
  GetCallerIdentityCommand,
  GetFederationTokenCommand,
} = require("@aws-sdk/client-sts");

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

function createSTSProxy(config) {
  const client = new STSClient(config);

  const proxy = {
    _client: client,
    _config: config,

    assumeRole(params, callback) {
      const promise = client.send(new AssumeRoleCommand(params));
      return createRequest(promise, callback);
    },

    getCallerIdentity(params, callback) {
      const promise = client.send(new GetCallerIdentityCommand(params));
      return createRequest(promise, callback);
    },

    getFederationToken(params, callback) {
      const promise = client.send(new GetFederationTokenCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createSTSProxy,
};
