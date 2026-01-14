/**
 * ECS v3 Connect Integration Tests
 *
 * Tests that connect('ECS') returns a v3 proxy instead of a v2 client.
 */

const { expect } = require("chai");

describe("@turbot/aws-sdk ECS v3 integration", function () {
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

  describe("connect('ECS') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const taws = require("../index");
      const ecs = taws.connect("ECS", { region: "us-east-1" });

      expect(ecs).to.be.an("object");
      expect(ecs.runTask).to.be.a("function");
    });

    it("has _client property (v3 ECSClient)", function () {
      const taws = require("../index");
      const ecs = taws.connect("ECS", { region: "us-east-1" });

      expect(ecs._client).to.be.an("object");
      // v3 client has send method
      expect(ecs._client.send).to.be.a("function");
    });

    it("has _config property with region", function () {
      const taws = require("../index");
      const ecs = taws.connect("ECS", { region: "ap-southeast-2" });

      expect(ecs._config).to.be.an("object");
      expect(ecs._config.region).to.equal("ap-southeast-2");
    });

    it("is NOT a v2 AWS.ECS instance", function () {
      const taws = require("../index");
      const AWS = require("aws-sdk");
      const ecs = taws.connect("ECS", { region: "us-east-1" });

      // v2 client would be instanceof AWS.ECS
      expect(ecs instanceof AWS.ECS).to.be.false;
    });
  });

  describe("ECS proxy with proxy agent via connect()", function () {
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

      const ecs = taws.connect("ECS", { region: "us-east-1" });

      // The proxy should be configured in the request handler
      expect(ecs._config.requestHandler).to.be.an("object");
    });
  });
});
