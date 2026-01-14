/**
 * SES v3 Connect Integration Tests
 *
 * Tests that connect('SES') returns a v3 proxy instead of a v2 client.
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk SES v3 integration", function () {
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

  describe("connect('SES') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const ses = taws.connect("SES", { region: "us-east-1" });

      expect(ses).to.be.an("object");
      expect(ses.sendEmail).to.be.a("function");
    });

    it("has _client property (v3 SESClient)", function () {
      const taws = require("../index");
      const ses = taws.connect("SES", { region: "us-east-1" });

      expect(ses._client).to.be.an("object");
      // v3 client has send method
      expect(ses._client.send).to.be.a("function");
    });

    it("has _config property with region", function () {
      const taws = require("../index");
      const ses = taws.connect("SES", { region: "ap-southeast-2" });

      expect(ses._config).to.be.an("object");
      expect(ses._config.region).to.equal("ap-southeast-2");
    });

    it("is NOT a v2 AWS.SES instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const ses = taws.connect("SES", { region: "us-east-1" });

      // v2 client would be instanceof AWS.SES
      expect(ses instanceof AWS.SES).to.be.false;
    });
  });

  describe("buildV3Config for SES", function () {
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

  describe("SES proxy with proxy agent via connect()", function () {
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

      const ses = taws.connect("SES", { region: "us-east-1" });

      // The proxy should be configured in the request handler
      expect(ses._config.requestHandler).to.be.an("object");
    });
  });
});
