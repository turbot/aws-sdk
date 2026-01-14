/**
 * ElastiCache v3 Connect Integration Tests
 *
 * Tests that connect('ElastiCache') returns a v3 proxy instead of a v2 client.
 *
 * NOTE: These tests require the ElastiCache proxy to be integrated into the
 * connect() function in index.js. If the integration is not yet complete,
 * some tests may fail until the following is added to index.js:
 *
 * 1. Import: const { createElastiCacheProxy } = require("./lib/elasticache-proxy");
 * 2. In connect(): if (serviceKey === "ElastiCache") { ... return createElastiCacheProxy(v3Config); }
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk ElastiCache v3 integration", function () {
  // Store original env
  let originalEnv;

  beforeEach(function () {
    originalEnv = { ...process.env };
    // Set default region to prevent errors
    process.env.AWS_DEFAULT_REGION = "us-east-1";
  });

  afterEach(function () {
    // Restore original env
    process.env = originalEnv;
    // Clear require cache to ensure fresh module state
    delete require.cache[require.resolve("../index")];
  });

  describe("connect('ElastiCache') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

      expect(elasticache).to.be.an("object");
      expect(elasticache.createUser).to.be.a("function");
      expect(elasticache.deleteUser).to.be.a("function");
      expect(elasticache.describeUsers).to.be.a("function");
      expect(elasticache.modifyUser).to.be.a("function");
      expect(elasticache.createUserGroup).to.be.a("function");
      expect(elasticache.deleteUserGroup).to.be.a("function");
      expect(elasticache.describeUserGroups).to.be.a("function");
      expect(elasticache.describeReplicationGroups).to.be.a("function");
      expect(elasticache.modifyReplicationGroup).to.be.a("function");
      expect(elasticache.waitFor).to.be.a("function");
    });

    it("has _client property (v3 ElastiCacheClient)", function () {
      const taws = require("../index");
      const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

      expect(elasticache._client).to.be.an("object");
      // v3 client has send method
      expect(elasticache._client.send).to.be.a("function");
    });

    it("has _config property with region", function () {
      const taws = require("../index");
      const elasticache = taws.connect("ElastiCache", { region: "ap-southeast-2" });

      expect(elasticache._config).to.be.an("object");
      expect(elasticache._config.region).to.equal("ap-southeast-2");
    });

    it("is NOT a v2 AWS.ElastiCache instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

      // v2 client would be instanceof AWS.ElastiCache
      expect(elasticache instanceof AWS.ElastiCache).to.be.false;
    });
  });

  describe("ElastiCache v3 config building", function () {
    describe("region", function () {
      it("passes through region", function () {
        const taws = require("../index");
        const elasticache = taws.connect("ElastiCache", { region: "eu-west-1" });

        expect(elasticache._config.region).to.equal("eu-west-1");
      });
    });

    describe("credentials", function () {
      it("passes through credentials when all three are provided", function () {
        const taws = require("../index");
        const elasticache = taws.connect("ElastiCache", {
          region: "us-east-1",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: "TOKEN",
        });

        expect(elasticache._config.credentials).to.deep.equal({
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: "TOKEN",
        });
      });

      it("passes through credentials without sessionToken", function () {
        const taws = require("../index");
        const elasticache = taws.connect("ElastiCache", {
          region: "us-east-1",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
        });

        expect(elasticache._config.credentials).to.deep.equal({
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: undefined,
        });
      });

      it("does not set credentials if accessKeyId is missing", function () {
        const taws = require("../index");
        const elasticache = taws.connect("ElastiCache", {
          region: "us-east-1",
          secretAccessKey: "SECRET",
        });

        expect(elasticache._config.credentials).to.be.undefined;
      });

      it("does not set credentials if secretAccessKey is missing", function () {
        const taws = require("../index");
        const elasticache = taws.connect("ElastiCache", {
          region: "us-east-1",
          accessKeyId: "AKID",
        });

        expect(elasticache._config.credentials).to.be.undefined;
      });
    });

    describe("proxy support", function () {
      it("creates requestHandler when httpOptions.agent is present", function () {
        // Set up proxy configuration via environment
        process.env.TURBOT_CONFIG_ENV = JSON.stringify({
          aws: {
            proxy: {
              https_proxy: "http://proxy.example.com:8080",
              enabled: ["*"],
              disabled: [],
            },
          },
        });

        // Clear require cache to pick up new env
        delete require.cache[require.resolve("../index")];
        const taws = require("../index");

        const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

        // The proxy should be configured in the request handler
        expect(elasticache._config.requestHandler).to.be.an("object");
      });

      it("does not create requestHandler without proxy configuration", function () {
        const taws = require("../index");
        const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

        expect(elasticache._config.requestHandler).to.be.undefined;
      });
    });
  });

  describe("ElastiCache proxy method behavior", function () {
    it("describeUsers returns object with promise method", function () {
      const taws = require("../index");
      const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

      const result = elasticache.describeUsers({});

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("describeReplicationGroups returns object with promise method", function () {
      const taws = require("../index");
      const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

      const result = elasticache.describeReplicationGroups({});

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor is a function", function () {
      const taws = require("../index");
      const elasticache = taws.connect("ElastiCache", { region: "us-east-1" });

      expect(elasticache.waitFor).to.be.a("function");
    });
  });
});
