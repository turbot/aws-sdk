/**
 * Lambda v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 *
 * Supported methods:
 * - invoke, createFunction, deleteFunction, updateFunctionCode, updateFunctionConfiguration
 * - getFunction, getAlias, createAlias, updateAlias, deleteAlias
 * - getPolicy, addPermission, listFunctions, listVersionsByFunction, listAliases
 * - listTags, tagResource, getAccountSettings
 * - getFunctionRecursionConfig, putFunctionRecursionConfig
 * - waitFor (functionUpdated, functionActive)
 */

const {
  LambdaClient,
  InvokeCommand,
  CreateFunctionCommand,
  DeleteFunctionCommand,
  UpdateFunctionCodeCommand,
  UpdateFunctionConfigurationCommand,
  GetFunctionCommand,
  GetAliasCommand,
  CreateAliasCommand,
  UpdateAliasCommand,
  DeleteAliasCommand,
  GetPolicyCommand,
  AddPermissionCommand,
  ListFunctionsCommand,
  ListVersionsByFunctionCommand,
  ListAliasesCommand,
  ListTagsCommand,
  TagResourceCommand,
  GetAccountSettingsCommand,
  GetFunctionRecursionConfigCommand,
  PutFunctionRecursionConfigCommand,
  waitUntilFunctionUpdatedV2,
  waitUntilFunctionActiveV2,
} = require("@aws-sdk/client-lambda");

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

function createLambdaProxy(config) {
  const client = new LambdaClient(config);

  const proxy = {
    _client: client,
    _config: config,

    invoke(params, callback) {
      const promise = client.send(new InvokeCommand(params));
      return createRequest(promise, callback);
    },

    createFunction(params, callback) {
      const promise = client.send(new CreateFunctionCommand(params));
      return createRequest(promise, callback);
    },

    deleteFunction(params, callback) {
      const promise = client.send(new DeleteFunctionCommand(params));
      return createRequest(promise, callback);
    },

    updateFunctionCode(params, callback) {
      const promise = client.send(new UpdateFunctionCodeCommand(params));
      return createRequest(promise, callback);
    },

    updateFunctionConfiguration(params, callback) {
      const promise = client.send(new UpdateFunctionConfigurationCommand(params));
      return createRequest(promise, callback);
    },

    getFunction(params, callback) {
      const promise = client.send(new GetFunctionCommand(params));
      return createRequest(promise, callback);
    },

    getAlias(params, callback) {
      const promise = client.send(new GetAliasCommand(params));
      return createRequest(promise, callback);
    },

    createAlias(params, callback) {
      const promise = client.send(new CreateAliasCommand(params));
      return createRequest(promise, callback);
    },

    updateAlias(params, callback) {
      const promise = client.send(new UpdateAliasCommand(params));
      return createRequest(promise, callback);
    },

    deleteAlias(params, callback) {
      const promise = client.send(new DeleteAliasCommand(params));
      return createRequest(promise, callback);
    },

    getPolicy(params, callback) {
      const promise = client.send(new GetPolicyCommand(params));
      return createRequest(promise, callback);
    },

    addPermission(params, callback) {
      const promise = client.send(new AddPermissionCommand(params));
      return createRequest(promise, callback);
    },

    listFunctions(params, callback) {
      const promise = client.send(new ListFunctionsCommand(params));
      return createRequest(promise, callback);
    },

    listVersionsByFunction(params, callback) {
      const promise = client.send(new ListVersionsByFunctionCommand(params));
      return createRequest(promise, callback);
    },

    listAliases(params, callback) {
      const promise = client.send(new ListAliasesCommand(params));
      return createRequest(promise, callback);
    },

    listTags(params, callback) {
      const promise = client.send(new ListTagsCommand(params));
      return createRequest(promise, callback);
    },

    tagResource(params, callback) {
      const promise = client.send(new TagResourceCommand(params));
      return createRequest(promise, callback);
    },

    getAccountSettings(params, callback) {
      const promise = client.send(new GetAccountSettingsCommand(params));
      return createRequest(promise, callback);
    },

    getFunctionRecursionConfig(params, callback) {
      const promise = client.send(new GetFunctionRecursionConfigCommand(params));
      return createRequest(promise, callback);
    },

    putFunctionRecursionConfig(params, callback) {
      const promise = client.send(new PutFunctionRecursionConfigCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * waitFor - v2-compatible waiter pattern
     *
     * v2: lambda.waitFor('functionUpdated', params, callback)
     * v3: Uses waitUntilFunctionUpdatedV2 / waitUntilFunctionActiveV2
     */
    waitFor(state, params, callback) {
      let waiterPromise;

      const waiterConfig = {
        client,
        maxWaitTime: 300, // 5 minutes default
        minDelay: 5,
        maxDelay: 120,
      };

      if (state === "functionUpdated") {
        waiterPromise = waitUntilFunctionUpdatedV2(waiterConfig, params);
      } else if (state === "functionActive") {
        waiterPromise = waitUntilFunctionActiveV2(waiterConfig, params);
      } else {
        const err = new Error(`Unsupported waitFor state: ${state}`);
        if (callback) {
          return callback(err);
        }
        throw err;
      }

      return createRequest(waiterPromise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createLambdaProxy,
};
