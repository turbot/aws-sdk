/**
 * ElastiCache v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: elasticache.describeUsers(params, (err, data) => {})
 * 2. Promise:  elasticache.describeUsers(params).promise()
 *
 * Supported methods:
 * - createUser, deleteUser, describeUsers, modifyUser
 * - createUserGroup, deleteUserGroup, describeUserGroups
 * - describeReplicationGroups, modifyReplicationGroup
 * - waitFor (replicationGroupAvailable)
 */

const {
  ElastiCacheClient,
  CreateUserCommand,
  DeleteUserCommand,
  DescribeUsersCommand,
  ModifyUserCommand,
  CreateUserGroupCommand,
  DeleteUserGroupCommand,
  DescribeUserGroupsCommand,
  DescribeReplicationGroupsCommand,
  ModifyReplicationGroupCommand,
  waitUntilReplicationGroupAvailable,
} = require("@aws-sdk/client-elasticache");

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
 * Create an ElastiCache proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - ElastiCache client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createElastiCacheProxy(config) {
  const client = new ElastiCacheClient(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * createUser - Create a new Redis user
     */
    createUser(params, callback) {
      const promise = client.send(new CreateUserCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteUser - Delete a Redis user
     */
    deleteUser(params, callback) {
      const promise = client.send(new DeleteUserCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeUsers - Describe Redis users
     */
    describeUsers(params, callback) {
      const promise = client.send(new DescribeUsersCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * modifyUser - Modify a Redis user
     */
    modifyUser(params, callback) {
      const promise = client.send(new ModifyUserCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * createUserGroup - Create a Redis user group
     */
    createUserGroup(params, callback) {
      const promise = client.send(new CreateUserGroupCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteUserGroup - Delete a Redis user group
     */
    deleteUserGroup(params, callback) {
      const promise = client.send(new DeleteUserGroupCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeUserGroups - Describe Redis user groups
     */
    describeUserGroups(params, callback) {
      const promise = client.send(new DescribeUserGroupsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeReplicationGroups - Describe replication groups
     */
    describeReplicationGroups(params, callback) {
      const promise = client.send(new DescribeReplicationGroupsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * modifyReplicationGroup - Modify a replication group
     */
    modifyReplicationGroup(params, callback) {
      const promise = client.send(new ModifyReplicationGroupCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * waitFor - Wait for a resource to reach a specific state
     *
     * v2: elasticache.waitFor('replicationGroupAvailable', params, callback)
     * v3: Uses waitUntilReplicationGroupAvailable
     *
     * Supported states:
     * - replicationGroupAvailable
     */
    waitFor(state, params, callback) {
      let promise;

      if (state === "replicationGroupAvailable") {
        // v3 waiter config
        const waiterConfig = {
          client: client,
          maxWaitTime: 300, // 5 minutes
          minDelay: 15,
          maxDelay: 120,
        };

        promise = waitUntilReplicationGroupAvailable(waiterConfig, params).then((result) => {
          // v3 waiters return { state: 'SUCCESS', reason: {...} }
          // v2 returns the describe result, so we fetch it
          return client.send(new DescribeReplicationGroupsCommand(params));
        });
      } else {
        promise = Promise.reject(new Error(`Unknown waiter state: ${state}`));
      }

      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createElastiCacheProxy,
};
