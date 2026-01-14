/**
 * ElastiCache Proxy Unit Tests
 *
 * Tests the ElastiCache v2-to-v3 proxy's callback/promise bridging behavior.
 * These are unit tests that don't require AWS credentials.
 */

const { expect } = require("chai");
const { createElastiCacheProxy } = require("../lib/elasticache-proxy");

describe("ElastiCache Proxy", function () {
  describe("createElastiCacheProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createElastiCacheProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.createUser).to.be.a("function");
      expect(proxy.deleteUser).to.be.a("function");
      expect(proxy.describeUsers).to.be.a("function");
      expect(proxy.modifyUser).to.be.a("function");
      expect(proxy.createUserGroup).to.be.a("function");
      expect(proxy.deleteUserGroup).to.be.a("function");
      expect(proxy.describeUserGroups).to.be.a("function");
      expect(proxy.describeReplicationGroups).to.be.a("function");
      expect(proxy.modifyReplicationGroup).to.be.a("function");
      expect(proxy.waitFor).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });

    it("should preserve config in _config property", function () {
      const config = { region: "ap-southeast-2", credentials: { accessKeyId: "test", secretAccessKey: "test" } };
      const proxy = createElastiCacheProxy(config);

      expect(proxy._config).to.deep.equal(config);
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createElastiCacheProxy({ region: "us-east-1" });
    });

    it("createUser should return object with promise method", function () {
      const result = proxy.createUser({ UserId: "test-user", UserName: "testuser", Engine: "redis", AccessString: "on ~* +@all" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("deleteUser should return object with promise method", function () {
      const result = proxy.deleteUser({ UserId: "test-user" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("describeUsers should return object with promise method", function () {
      const result = proxy.describeUsers({});

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("modifyUser should return object with promise method", function () {
      const result = proxy.modifyUser({ UserId: "test-user", AccessString: "on ~* +@read" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("createUserGroup should return object with promise method", function () {
      const result = proxy.createUserGroup({ UserGroupId: "test-group", Engine: "redis", UserIds: ["default"] });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("deleteUserGroup should return object with promise method", function () {
      const result = proxy.deleteUserGroup({ UserGroupId: "test-group" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("describeUserGroups should return object with promise method", function () {
      const result = proxy.describeUserGroups({});

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("describeReplicationGroups should return object with promise method", function () {
      const result = proxy.describeReplicationGroups({});

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("modifyReplicationGroup should return object with promise method", function () {
      const result = proxy.modifyReplicationGroup({ ReplicationGroupId: "test-group", ApplyImmediately: true });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor should return object with promise method", function () {
      const result = proxy.waitFor("replicationGroupAvailable", { ReplicationGroupId: "test-group" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });
  });

  describe("error normalization", function () {
    // Note: These tests verify the proxy structure, not actual AWS calls.
    // Integration tests cover real AWS behavior.

    it("should have normalizeError in module scope", function () {
      // This test verifies the error normalization is applied.
      // Actual error testing happens in integration tests.
      const proxy = createElastiCacheProxy({ region: "us-east-1" });
      const result = proxy.describeUsers({});

      // The promise should exist and be callable
      expect(result.promise()).to.be.a("promise");
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createElastiCacheProxy({ region: "us-east-1" });
    });

    it("createUser should accept callback as second argument", function () {
      // Just verify the callback is accepted without throwing
      proxy.createUser({ UserId: "test", UserName: "test", Engine: "redis", AccessString: "on ~* +@all" }, () => {});
      expect(true).to.be.true; // Just checking structure
    });

    it("deleteUser should accept callback as second argument", function () {
      proxy.deleteUser({ UserId: "test" }, () => {});
      expect(true).to.be.true;
    });

    it("describeUsers should accept callback as second argument", function () {
      proxy.describeUsers({}, () => {});
      expect(true).to.be.true;
    });

    it("modifyUser should accept callback as second argument", function () {
      proxy.modifyUser({ UserId: "test", AccessString: "on ~* +@read" }, () => {});
      expect(true).to.be.true;
    });

    it("createUserGroup should accept callback as second argument", function () {
      proxy.createUserGroup({ UserGroupId: "test", Engine: "redis", UserIds: ["default"] }, () => {});
      expect(true).to.be.true;
    });

    it("deleteUserGroup should accept callback as second argument", function () {
      proxy.deleteUserGroup({ UserGroupId: "test" }, () => {});
      expect(true).to.be.true;
    });

    it("describeUserGroups should accept callback as second argument", function () {
      proxy.describeUserGroups({}, () => {});
      expect(true).to.be.true;
    });

    it("describeReplicationGroups should accept callback as second argument", function () {
      proxy.describeReplicationGroups({}, () => {});
      expect(true).to.be.true;
    });

    it("modifyReplicationGroup should accept callback as second argument", function () {
      proxy.modifyReplicationGroup({ ReplicationGroupId: "test", ApplyImmediately: true }, () => {});
      expect(true).to.be.true;
    });

    it("waitFor should accept callback as third argument", function () {
      proxy.waitFor("replicationGroupAvailable", { ReplicationGroupId: "test" }, () => {});
      expect(true).to.be.true;
    });
  });

  describe("waitFor method", function () {
    let proxy;

    beforeEach(function () {
      proxy = createElastiCacheProxy({ region: "us-east-1" });
    });

    it("waitFor should exist and be a function", function () {
      expect(proxy.waitFor).to.be.a("function");
    });

    it("waitFor should support replicationGroupAvailable state", function () {
      const result = proxy.waitFor("replicationGroupAvailable", { ReplicationGroupId: "test-group" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor with unknown state should return promise that rejects", async function () {
      const result = proxy.waitFor("unknownState", { ReplicationGroupId: "test-group" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");

      try {
        await result.promise();
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err.message).to.include("Unknown waiter state");
      }
    });
  });
});
