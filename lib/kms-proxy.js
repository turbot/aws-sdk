/**
 * KMS v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported methods:
 * - decrypt, encrypt, generateDataKey, describeKey
 */

const {
  KMSClient,
  DecryptCommand,
  EncryptCommand,
  GenerateDataKeyCommand,
  DescribeKeyCommand,
} = require("@aws-sdk/client-kms");

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

function createKMSProxy(config) {
  const client = new KMSClient(config);

  const proxy = {
    _client: client,
    _config: config,

    decrypt(params, callback) {
      const promise = client.send(new DecryptCommand(params));
      return createRequest(promise, callback);
    },

    encrypt(params, callback) {
      const promise = client.send(new EncryptCommand(params));
      return createRequest(promise, callback);
    },

    generateDataKey(params, callback) {
      const promise = client.send(new GenerateDataKeyCommand(params));
      return createRequest(promise, callback);
    },

    describeKey(params, callback) {
      const promise = client.send(new DescribeKeyCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createKMSProxy,
};
