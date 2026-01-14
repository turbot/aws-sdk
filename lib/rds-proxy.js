/**
 * RDS v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: rds.describeDBInstances(params, (err, data) => {})
 * 2. Promise:  rds.describeDBInstances(params).promise()
 *
 * Supported methods:
 * - describeDBInstances, describeDBParameters, modifyDBInstance, describeSourceRegions
 * - describeDBSnapshots, modifyDBSnapshotAttribute, copyDBSnapshot, createDBSnapshot, deleteDBSnapshot
 */

const {
  RDSClient,
  DescribeDBInstancesCommand,
  DescribeDBParametersCommand,
  ModifyDBInstanceCommand,
  DescribeSourceRegionsCommand,
  DescribeDBSnapshotsCommand,
  ModifyDBSnapshotAttributeCommand,
  CopyDBSnapshotCommand,
  CreateDBSnapshotCommand,
  DeleteDBSnapshotCommand,
} = require("@aws-sdk/client-rds");

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
 * Create an RDS proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - RDS client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createRDSProxy(config) {
  const client = new RDSClient(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * describeDBInstances - Retrieve information about provisioned RDS instances
     *
     * v2: rds.describeDBInstances(params, callback) or rds.describeDBInstances(params).promise()
     */
    describeDBInstances(params, callback) {
      const promise = client.send(new DescribeDBInstancesCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeDBParameters - Retrieve parameters for a DB parameter group
     *
     * v2: rds.describeDBParameters(params, callback) or rds.describeDBParameters(params).promise()
     */
    describeDBParameters(params, callback) {
      const promise = client.send(new DescribeDBParametersCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * modifyDBInstance - Modify settings for a DB instance
     *
     * v2: rds.modifyDBInstance(params, callback) or rds.modifyDBInstance(params).promise()
     */
    modifyDBInstance(params, callback) {
      const promise = client.send(new ModifyDBInstanceCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeSourceRegions - Retrieve source regions for cross-region operations
     *
     * v2: rds.describeSourceRegions(params, callback) or rds.describeSourceRegions(params).promise()
     */
    describeSourceRegions(params, callback) {
      const promise = client.send(new DescribeSourceRegionsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * describeDBSnapshots - Retrieve information about DB snapshots
     *
     * v2: rds.describeDBSnapshots(params, callback) or rds.describeDBSnapshots(params).promise()
     */
    describeDBSnapshots(params, callback) {
      const promise = client.send(new DescribeDBSnapshotsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * modifyDBSnapshotAttribute - Modify snapshot sharing attributes
     *
     * v2: rds.modifyDBSnapshotAttribute(params, callback) or rds.modifyDBSnapshotAttribute(params).promise()
     */
    modifyDBSnapshotAttribute(params, callback) {
      const promise = client.send(new ModifyDBSnapshotAttributeCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * copyDBSnapshot - Copy a DB snapshot
     *
     * v2: rds.copyDBSnapshot(params, callback) or rds.copyDBSnapshot(params).promise()
     */
    copyDBSnapshot(params, callback) {
      const promise = client.send(new CopyDBSnapshotCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * createDBSnapshot - Create a DB snapshot
     *
     * v2: rds.createDBSnapshot(params, callback) or rds.createDBSnapshot(params).promise()
     */
    createDBSnapshot(params, callback) {
      const promise = client.send(new CreateDBSnapshotCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteDBSnapshot - Delete a DB snapshot
     *
     * v2: rds.deleteDBSnapshot(params, callback) or rds.deleteDBSnapshot(params).promise()
     */
    deleteDBSnapshot(params, callback) {
      const promise = client.send(new DeleteDBSnapshotCommand(params));
      return createRequest(promise, callback);
    },
  };

  return proxy;
}

module.exports = {
  createRDSProxy,
};
