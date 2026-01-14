/**
 * SSM Proxy Integration Tests
 *
 * Tests the SSM v3 proxy against real AWS SSM Parameter Store.
 * Uses a test prefix (/turbot-sdk-test/) to avoid conflicts with production parameters.
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const { createSSMProxy } = require("../../lib/ssm-proxy");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";
const TEST_PREFIX = "/turbot-sdk-test";
const TEST_PARAM_NAME = `${TEST_PREFIX}/test-param-${Date.now()}`;
const TEST_PARAM_VALUE = `test-value-${Date.now()}`;

describe("SSM Proxy Integration Tests", function () {
  // These tests hit real AWS, allow longer timeout
  this.timeout(30000);

  let ssm;

  before(function () {
    // Create SSM proxy with default credential chain
    ssm = createSSMProxy({
      region: TEST_REGION,
    });
  });

  describe("putParameter", function () {
    it("creates a new parameter with callback pattern", function (done) {
      ssm.putParameter(
        {
          Name: TEST_PARAM_NAME,
          Value: TEST_PARAM_VALUE,
          Type: "String",
          Overwrite: true,
          Description: "SDK integration test parameter",
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Version).to.be.a("number");
          done();
        }
      );
    });

    it("overwrites parameter with promise pattern", async function () {
      const newValue = `updated-value-${Date.now()}`;
      const data = await ssm
        .putParameter({
          Name: TEST_PARAM_NAME,
          Value: newValue,
          Type: "String",
          Overwrite: true,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.Version).to.be.a("number");
      expect(data.Version).to.be.at.least(2); // Should be version 2 or higher
    });
  });

  describe("getParameter", function () {
    it("retrieves a parameter with callback pattern", function (done) {
      ssm.getParameter(
        {
          Name: TEST_PARAM_NAME,
          WithDecryption: false,
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Parameter).to.be.an("object");
          expect(data.Parameter.Name).to.equal(TEST_PARAM_NAME);
          expect(data.Parameter.Type).to.equal("String");
          expect(data.Parameter.Value).to.be.a("string");
          done();
        }
      );
    });

    it("retrieves a parameter with promise pattern", async function () {
      const data = await ssm
        .getParameter({
          Name: TEST_PARAM_NAME,
          WithDecryption: false,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.Parameter).to.be.an("object");
      expect(data.Parameter.Name).to.equal(TEST_PARAM_NAME);
    });

    it("returns error with code property for non-existent parameter", function (done) {
      ssm.getParameter(
        {
          Name: "/turbot-sdk-test/nonexistent-param-12345",
        },
        (err) => {
          expect(err).to.be.an("error");
          expect(err.code).to.equal("ParameterNotFound");
          done();
        }
      );
    });
  });

  describe("getParameters", function () {
    it("retrieves multiple parameters with callback pattern", function (done) {
      ssm.getParameters(
        {
          Names: [TEST_PARAM_NAME],
          WithDecryption: false,
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Parameters).to.be.an("array");
          expect(data.Parameters.length).to.be.at.least(1);
          expect(data.Parameters[0].Name).to.equal(TEST_PARAM_NAME);
          done();
        }
      );
    });

    it("retrieves multiple parameters with promise pattern", async function () {
      const data = await ssm
        .getParameters({
          Names: [TEST_PARAM_NAME],
          WithDecryption: false,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.Parameters).to.be.an("array");
      expect(data.Parameters.length).to.be.at.least(1);
    });

    it("returns InvalidParameters for non-existent names", async function () {
      const data = await ssm
        .getParameters({
          Names: ["/turbot-sdk-test/nonexistent-1", "/turbot-sdk-test/nonexistent-2"],
          WithDecryption: false,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.InvalidParameters).to.be.an("array");
      expect(data.InvalidParameters).to.include("/turbot-sdk-test/nonexistent-1");
      expect(data.InvalidParameters).to.include("/turbot-sdk-test/nonexistent-2");
    });
  });

  describe("getParametersByPath", function () {
    it("retrieves parameters by path with callback pattern", function (done) {
      ssm.getParametersByPath(
        {
          Path: TEST_PREFIX,
          WithDecryption: false,
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Parameters).to.be.an("array");
          // Should find our test parameter
          const testParam = data.Parameters.find((p) => p.Name === TEST_PARAM_NAME);
          expect(testParam).to.exist;
          done();
        }
      );
    });

    it("retrieves parameters by path with promise pattern", async function () {
      const data = await ssm
        .getParametersByPath({
          Path: TEST_PREFIX,
          WithDecryption: false,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.Parameters).to.be.an("array");
      // Should find our test parameter
      const testParam = data.Parameters.find((p) => p.Name === TEST_PARAM_NAME);
      expect(testParam).to.exist;
    });

    it("returns empty array for non-existent path", async function () {
      const data = await ssm
        .getParametersByPath({
          Path: "/turbot-sdk-test/nonexistent-path-12345",
          WithDecryption: false,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.Parameters).to.be.an("array");
      expect(data.Parameters.length).to.equal(0);
    });
  });

  describe("deleteParameter", function () {
    it("deletes a parameter with callback pattern", function (done) {
      // Create a parameter to delete
      const deleteTestName = `${TEST_PREFIX}/delete-test-${Date.now()}`;

      ssm.putParameter(
        {
          Name: deleteTestName,
          Value: "to-be-deleted",
          Type: "String",
        },
        (err) => {
          if (err) return done(err);

          // Now delete it
          ssm.deleteParameter({ Name: deleteTestName }, (err, data) => {
            if (err) return done(err);

            expect(data).to.be.an("object");
            done();
          });
        }
      );
    });

    it("deletes a parameter with promise pattern", async function () {
      // Create a parameter to delete
      const deleteTestName = `${TEST_PREFIX}/delete-test-promise-${Date.now()}`;

      await ssm
        .putParameter({
          Name: deleteTestName,
          Value: "to-be-deleted",
          Type: "String",
        })
        .promise();

      const data = await ssm.deleteParameter({ Name: deleteTestName }).promise();
      expect(data).to.be.an("object");
    });

    it("returns error with code for non-existent parameter", function (done) {
      ssm.deleteParameter(
        {
          Name: "/turbot-sdk-test/nonexistent-delete-test",
        },
        (err) => {
          expect(err).to.be.an("error");
          expect(err.code).to.equal("ParameterNotFound");
          done();
        }
      );
    });
  });

  // Cleanup after all tests
  after(async function () {
    // Delete the main test parameter
    try {
      await ssm.deleteParameter({ Name: TEST_PARAM_NAME }).promise();
    } catch (err) {
      // Ignore if already deleted
      if (err.code !== "ParameterNotFound") {
        console.warn(`Warning: Could not delete test parameter ${TEST_PARAM_NAME}:`, err.message);
      }
    }
  });
});
