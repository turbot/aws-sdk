/**
 * Lambda v3 Connect Integration Tests
 *
 * Tests that connect('Lambda') returns a v3 proxy instead of a v2 client.
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk Lambda v3 integration", function () {
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

  describe("connect('Lambda') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const lambda = taws.connect("Lambda", { region: "us-east-1" });

      expect(lambda).to.be.an("object");
      expect(lambda.invoke).to.be.a("function");
      expect(lambda.createFunction).to.be.a("function");
      expect(lambda.deleteFunction).to.be.a("function");
      expect(lambda.updateFunctionCode).to.be.a("function");
      expect(lambda.updateFunctionConfiguration).to.be.a("function");
      expect(lambda.getFunction).to.be.a("function");
      expect(lambda.getAlias).to.be.a("function");
      expect(lambda.createAlias).to.be.a("function");
      expect(lambda.updateAlias).to.be.a("function");
      expect(lambda.deleteAlias).to.be.a("function");
      expect(lambda.getPolicy).to.be.a("function");
      expect(lambda.addPermission).to.be.a("function");
      expect(lambda.listFunctions).to.be.a("function");
      expect(lambda.listVersionsByFunction).to.be.a("function");
      expect(lambda.listAliases).to.be.a("function");
      expect(lambda.listTags).to.be.a("function");
      expect(lambda.tagResource).to.be.a("function");
      expect(lambda.getAccountSettings).to.be.a("function");
      expect(lambda.getFunctionRecursionConfig).to.be.a("function");
      expect(lambda.putFunctionRecursionConfig).to.be.a("function");
      expect(lambda.waitFor).to.be.a("function");
    });

    it("has _client property (v3 LambdaClient)", function () {
      const taws = require("../index");
      const lambda = taws.connect("Lambda", { region: "us-east-1" });

      expect(lambda._client).to.be.an("object");
      // v3 client has send method
      expect(lambda._client.send).to.be.a("function");
    });

    it("has _config property with region", function () {
      const taws = require("../index");
      const lambda = taws.connect("Lambda", { region: "ap-southeast-2" });

      expect(lambda._config).to.be.an("object");
      expect(lambda._config.region).to.equal("ap-southeast-2");
    });

    it("is NOT a v2 AWS.Lambda instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const lambda = taws.connect("Lambda", { region: "us-east-1" });

      // v2 client would be instanceof AWS.Lambda
      expect(lambda instanceof AWS.Lambda).to.be.false;
    });
  });

  describe("buildV3Config for Lambda", function () {
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

  describe("Lambda proxy with proxy agent via connect()", function () {
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

      const lambda = taws.connect("Lambda", { region: "us-east-1" });

      // The proxy should be configured in the request handler
      expect(lambda._config.requestHandler).to.be.an("object");
    });
  });
});
