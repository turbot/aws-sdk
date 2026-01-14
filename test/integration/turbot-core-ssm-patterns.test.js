/**
 * Turbot-Core SSM Pattern Integration Tests
 *
 * Tests SSM v3 proxy with actual patterns used in turbot-core codebase.
 * These tests verify the proxy works correctly with real-world usage patterns.
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";
const TEST_PREFIX = "/turbot-sdk-test";
const TEST_PARAM_NAME = `${TEST_PREFIX}/turbot-pattern-test-${Date.now()}`;
const TEST_PARAM_VALUE = `test-value-${Date.now()}`;

describe("Turbot-Core SSM Patterns Integration Tests", function () {
  this.timeout(30000);

  let taws;
  let ssm;

  before(function () {
    // Use the actual @turbot/aws-sdk module via connect()
    taws = require("../../index");
  });

  // Clean up test parameter after all tests
  after(async function () {
    try {
      const cleanupSsm = taws.connect("SSM", { region: TEST_REGION });
      await cleanupSsm.deleteParameter({ Name: TEST_PARAM_NAME }).promise();
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe("Pattern: connect('SSM', { region }) with getParameters callback", function () {
    // From: lib/@turbot/kit/index.js:844
    // ssm.getParameters(params, (err, data) => { ... })

    before(async function () {
      // Create test parameter first
      ssm = taws.connect("SSM", { region: TEST_REGION });
      await ssm
        .putParameter({
          Name: TEST_PARAM_NAME,
          Value: TEST_PARAM_VALUE,
          Type: "String",
          Overwrite: true,
        })
        .promise();
    });

    it("getParameters with callback returns data.Parameters array", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const params = { Names: [TEST_PARAM_NAME], WithDecryption: true };

      ssm.getParameters(params, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Parameters).to.be.an("array");
        expect(data.Parameters.length).to.be.at.least(1);
        expect(data.Parameters[0].Name).to.equal(TEST_PARAM_NAME);
        expect(data.Parameters[0].Value).to.equal(TEST_PARAM_VALUE);
        done();
      });
    });
  });

  describe("Pattern: connect('SSM') with no params", function () {
    // From: lib/@turbot/turbot-hive-manager/main.js:1381
    // Uses AWS_DEFAULT_REGION from environment

    it("defaults to AWS_DEFAULT_REGION", function (done) {
      const originalRegion = process.env.AWS_DEFAULT_REGION;
      process.env.AWS_DEFAULT_REGION = TEST_REGION;

      const ssm = taws.connect("SSM");
      const params = { Names: [TEST_PARAM_NAME], WithDecryption: true };

      ssm.getParameters(params, (err, data) => {
        process.env.AWS_DEFAULT_REGION = originalRegion;
        if (err) return done(err);

        expect(data.Parameters).to.be.an("array");
        expect(data.Parameters.length).to.be.at.least(1);
        done();
      });
    });
  });

  describe("Pattern: connect('SSM', discoveryParams(region))", function () {
    // From: lib/@turbot/turbot-hive-manager/main.js:1433
    // const ssm = taws.connect("SSM", taws.discoveryParams(region));

    it("uses discoveryParams for retry configuration", function (done) {
      const ssm = taws.connect("SSM", taws.discoveryParams(TEST_REGION));
      const params = { Names: [TEST_PARAM_NAME], WithDecryption: true };

      ssm.getParameters(params, (err, data) => {
        if (err) return done(err);

        expect(data.Parameters).to.be.an("array");
        done();
      });
    });
  });

  describe("Pattern: putParameter with callback", function () {
    // From: lib/@turbot/turbot-hive-manager/main.js:1446
    // ssm.putParameter(params, (err, data) => { ... })

    it("putParameter returns version number", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const params = {
        Name: TEST_PARAM_NAME,
        Type: "String",
        Value: `updated-${Date.now()}`,
        Overwrite: true,
      };

      ssm.putParameter(params, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Version).to.be.a("number");
        expect(data.Version).to.be.at.least(1);
        done();
      });
    });
  });

  describe("Pattern: deleteParameter with callback", function () {
    // From: lib/@turbot/turbot-hive-manager/main.js:1490
    // ssm.deleteParameter(params, (err, result) => { ... })

    it("deleteParameter works correctly", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const deleteName = `${TEST_PREFIX}/delete-pattern-test-${Date.now()}`;

      // Create then delete
      ssm.putParameter(
        {
          Name: deleteName,
          Value: "to-delete",
          Type: "String",
        },
        (err) => {
          if (err) return done(err);

          ssm.deleteParameter({ Name: deleteName }, (err, result) => {
            if (err) return done(err);

            expect(result).to.be.an("object");
            done();
          });
        }
      );
    });
  });

  describe("Pattern: getParameter with callback", function () {
    // From: lib/@turbot/flags/index.js:139
    // ssm.getParameter(params, (err, data) => { ... })

    it("getParameter returns Parameter object", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const params = { Name: TEST_PARAM_NAME, WithDecryption: false };

      ssm.getParameter(params, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Parameter).to.be.an("object");
        expect(data.Parameter.Name).to.equal(TEST_PARAM_NAME);
        done();
      });
    });
  });

  describe("Pattern: getParametersByPath with callback", function () {
    // From: lib/@turbot/turbot-tick-manager/main.js:116
    // ssm.getParametersByPath(params, function (err, data) { ... })

    it("getParametersByPath returns Parameters array", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const params = { Path: TEST_PREFIX, WithDecryption: false };

      ssm.getParametersByPath(params, function (err, data) {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Parameters).to.be.an("array");
        // Should find our test parameter
        const found = data.Parameters.some((p) => p.Name === TEST_PARAM_NAME);
        expect(found).to.be.true;
        done();
      });
    });
  });

  describe("Pattern: Error handling with err.code", function () {
    // From: lib/@turbot/turbot-hive-manager/main.js:1387
    // if (err.code === "ParameterNotFound") { ... }

    it("error has .code property for ParameterNotFound", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });

      ssm.getParameter({ Name: "/nonexistent/param/12345" }, (err) => {
        expect(err).to.be.an("error");
        expect(err.code).to.equal("ParameterNotFound");
        done();
      });
    });
  });

  describe("Pattern: addTagsToResource with callback", function () {
    // From: lib/@turbot/turbot-hive-manager/main.js:1457
    // ssm.addTagsToResource(tagParams, (_err) => { ... })

    it("addTagsToResource adds tags to parameter", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const tagParams = {
        ResourceId: TEST_PARAM_NAME,
        ResourceType: "Parameter",
        Tags: [
          { Key: "Environment", Value: "Test" },
          { Key: "Project", Value: "SDK-Migration" },
        ],
      };

      ssm.addTagsToResource(tagParams, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        done();
      });
    });
  });

  describe("Pattern: connect('SSM', { region, accessKeyId, secretAccessKey, sessionToken })", function () {
    // Testing credential passthrough

    it("accepts credential parameters without error", function () {
      // Just verify it doesn't throw - actual auth depends on valid credentials
      const ssm = taws.connect("SSM", {
        region: TEST_REGION,
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
        sessionToken: "test-session-token",
      });

      expect(ssm).to.be.an("object");
      expect(ssm._config.credentials).to.deep.equal({
        accessKeyId: "test-access-key",
        secretAccessKey: "test-secret-key",
        sessionToken: "test-session-token",
      });
    });
  });

  describe("Pattern: new taws.connect('SSM', ...) instantiation", function () {
    // Some code may use new keyword accidentally

    it("works without 'new' keyword", function (done) {
      const ssm = taws.connect("SSM", { region: TEST_REGION });
      const params = { Names: [TEST_PARAM_NAME], WithDecryption: true };

      ssm.getParameters(params, (err, data) => {
        if (err) return done(err);

        expect(data.Parameters).to.be.an("array");
        done();
      });
    });
  });
});
