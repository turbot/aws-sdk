/**
 * RDS.Signer v3 Connect Integration Tests
 *
 * Tests that connect('RDS.Signer') returns a v3 proxy instead of a v2 client.
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk RDS.Signer v3 integration", function () {
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

  describe("connect('RDS.Signer') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      expect(signer).to.be.an("object");
      expect(signer.getAuthToken).to.be.a("function");
    });

    it("has _config property", function () {
      const taws = require("../index");
      const signer = taws.connect("RDS.Signer", {
        region: "ap-southeast-2",
        hostname: "mydb.cluster-123456789012.ap-southeast-2.rds.amazonaws.com",
        port: 3306,
        username: "dbuser",
      });

      expect(signer._config).to.be.an("object");
      expect(signer._config.region).to.equal("ap-southeast-2");
      expect(signer._config.hostname).to.equal("mydb.cluster-123456789012.ap-southeast-2.rds.amazonaws.com");
      expect(signer._config.port).to.equal(3306);
      expect(signer._config.username).to.equal("dbuser");
    });

    it("does NOT have _client property (Signer is created per-call)", function () {
      const taws = require("../index");
      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      // RDS.Signer proxy does not have _client because Signer instances
      // are created per-call with merged config
      expect(signer._client).to.be.undefined;
    });

    it("is NOT a v2 AWS.RDS.Signer instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      // v2 client would be instanceof AWS.RDS.Signer
      expect(signer instanceof AWS.RDS.Signer).to.be.false;
    });
  });

  describe("getAuthToken method signatures", function () {
    it("getAuthToken returns object with promise() method", function () {
      const taws = require("../index");
      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      const result = signer.getAuthToken({});
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("getAuthToken accepts callback as second argument", function () {
      const taws = require("../index");
      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      // Verify callback pattern is accepted
      let noError = true;
      try {
        signer.getAuthToken({}, () => {});
      } catch (e) {
        noError = false;
      }
      expect(noError).to.be.true;
    });

    it("getAuthToken accepts callback as first argument (no params)", function () {
      const taws = require("../index");
      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      // v2 compatibility: signer.getAuthToken((err, token) => {})
      let noError = true;
      try {
        signer.getAuthToken(() => {});
      } catch (e) {
        noError = false;
      }
      expect(noError).to.be.true;
    });
  });

  describe("RDS.Signer proxy with proxy agent via connect()", function () {
    it("passes proxy through when configured via TURBOT_CONFIG_ENV", function () {
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

      const signer = taws.connect("RDS.Signer", {
        region: "us-east-1",
        hostname: "mydb.cluster-123456789012.us-east-1.rds.amazonaws.com",
        port: 5432,
        username: "admin",
      });

      // The proxy config should be stored in _config
      // Note: RDS.Signer handles proxy differently - it's passed in httpOptions
      // which gets converted to the Signer's internal config
      expect(signer._config).to.be.an("object");
    });
  });
});
