/**
 * KMS v3 Connect Integration Tests
 *
 * Tests that connect('KMS') returns a v3 proxy instead of a v2 client.
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk KMS v3 integration", function () {
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

  describe("connect('KMS') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const kms = taws.connect("KMS", { region: "us-east-1" });

      expect(kms).to.be.an("object");
      expect(kms.decrypt).to.be.a("function");
      expect(kms.encrypt).to.be.a("function");
      expect(kms.generateDataKey).to.be.a("function");
      expect(kms.describeKey).to.be.a("function");
    });

    it("has _client property (v3 KMSClient)", function () {
      const taws = require("../index");
      const kms = taws.connect("KMS", { region: "us-east-1" });

      expect(kms._client).to.be.an("object");
      // v3 client has send method
      expect(kms._client.send).to.be.a("function");
    });

    it("has _config property with region", function () {
      const taws = require("../index");
      const kms = taws.connect("KMS", { region: "ap-southeast-2" });

      expect(kms._config).to.be.an("object");
      expect(kms._config.region).to.equal("ap-southeast-2");
    });

    it("is NOT a v2 AWS.KMS instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const kms = taws.connect("KMS", { region: "us-east-1" });

      // v2 client would be instanceof AWS.KMS
      expect(kms instanceof AWS.KMS).to.be.false;
    });
  });

  describe("buildV3Config for KMS", function () {
    describe("region", function () {
      it("passes through region", function () {
        const taws = require("../index");
        const result = taws.buildV3Config({ region: "eu-west-1" });

        expect(result.region).to.equal("eu-west-1");
      });
    });

    describe("credentials", function () {
      it("passes through credentials when all three are provided", function () {
        const taws = require("../index");
        const result = taws.buildV3Config({
          region: "us-east-1",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: "TOKEN",
        });

        expect(result.credentials).to.deep.equal({
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: "TOKEN",
        });
      });
    });

    describe("proxy support", function () {
      it("creates requestHandler when httpOptions.agent is present", function () {
        const taws = require("../index");
        const mockAgent = { mock: true };
        const result = taws.buildV3Config({
          region: "us-east-1",
          httpOptions: { agent: mockAgent },
        });

        expect(result.requestHandler).to.be.an("object");
      });
    });
  });

  describe("KMS proxy with proxy agent via connect()", function () {
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

      const kms = taws.connect("KMS", { region: "us-east-1" });

      // The proxy should be configured in the request handler
      expect(kms._config.requestHandler).to.be.an("object");
    });
  });
});
