/**
 * SSM v3 Connect Integration Tests
 *
 * Tests that connect('SSM') returns a v3 proxy instead of a v2 client.
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk SSM v3 integration", function () {
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

  describe("connect('SSM') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const ssm = taws.connect("SSM", { region: "us-east-1" });

      expect(ssm).to.be.an("object");
      expect(ssm.getParameter).to.be.a("function");
      expect(ssm.getParameters).to.be.a("function");
      expect(ssm.getParametersByPath).to.be.a("function");
      expect(ssm.putParameter).to.be.a("function");
      expect(ssm.deleteParameter).to.be.a("function");
    });

    it("has _client property (v3 SSMClient)", function () {
      const taws = require("../index");
      const ssm = taws.connect("SSM", { region: "us-east-1" });

      expect(ssm._client).to.be.an("object");
      // v3 client has send method
      expect(ssm._client.send).to.be.a("function");
    });

    it("has _config property with region", function () {
      const taws = require("../index");
      const ssm = taws.connect("SSM", { region: "ap-southeast-2" });

      expect(ssm._config).to.be.an("object");
      expect(ssm._config.region).to.equal("ap-southeast-2");
    });

    it("is NOT a v2 AWS.SSM instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const ssm = taws.connect("SSM", { region: "us-east-1" });

      // v2 client would be instanceof AWS.SSM
      expect(ssm instanceof AWS.SSM).to.be.false;
    });
  });

  describe("buildSSMV3Config", function () {
    describe("region", function () {
      it("passes through region", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({ region: "eu-west-1" });

        expect(result.region).to.equal("eu-west-1");
      });
    });

    describe("credentials", function () {
      it("passes through credentials when all three are provided", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({
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

      it("passes through credentials without sessionToken", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({
          region: "us-east-1",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
        });

        expect(result.credentials).to.deep.equal({
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: undefined,
        });
      });

      it("does not set credentials if accessKeyId is missing", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({
          region: "us-east-1",
          secretAccessKey: "SECRET",
        });

        expect(result.credentials).to.be.undefined;
      });

      it("does not set credentials if secretAccessKey is missing", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({
          region: "us-east-1",
          accessKeyId: "AKID",
        });

        expect(result.credentials).to.be.undefined;
      });
    });

    describe("proxy support", function () {
      it("creates requestHandler when httpOptions.agent is present", function () {
        const taws = require("../index");
        const mockAgent = { mock: true };
        const result = taws.buildSSMV3Config({
          region: "us-east-1",
          httpOptions: { agent: mockAgent },
        });

        expect(result.requestHandler).to.be.an("object");
      });

      it("does not create requestHandler without httpOptions.agent", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({
          region: "us-east-1",
          httpOptions: {},
        });

        expect(result.requestHandler).to.be.undefined;
      });

      it("does not create requestHandler without httpOptions", function () {
        const taws = require("../index");
        const result = taws.buildSSMV3Config({
          region: "us-east-1",
        });

        expect(result.requestHandler).to.be.undefined;
      });
    });
  });

  describe("SSM proxy with proxy agent via connect()", function () {
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

      const ssm = taws.connect("SSM", { region: "us-east-1" });

      // The proxy should be configured in the request handler
      expect(ssm._config.requestHandler).to.be.an("object");
    });
  });
});
