/**
 * Lambda Proxy Integration Tests
 *
 * Tests the Lambda v3 proxy against real AWS Lambda.
 * Uses read-only operations by default to avoid creating resources.
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const { createLambdaProxy } = require("../../lib/lambda-proxy");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";

describe("Lambda Proxy Integration Tests", function () {
  // These tests hit real AWS, allow longer timeout
  this.timeout(30000);

  let lambda;
  let existingFunctionName;

  before(function () {
    // Create Lambda proxy with default credential chain
    lambda = createLambdaProxy({
      region: TEST_REGION,
    });
  });

  describe("getAccountSettings", function () {
    it("gets account settings with callback pattern", function (done) {
      lambda.getAccountSettings({}, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.AccountLimit).to.be.an("object");
        expect(data.AccountUsage).to.be.an("object");
        done();
      });
    });

    it("gets account settings with promise pattern", async function () {
      const data = await lambda.getAccountSettings({}).promise();

      expect(data).to.be.an("object");
      expect(data.AccountLimit).to.be.an("object");
      expect(data.AccountUsage).to.be.an("object");
      expect(data.AccountLimit.TotalCodeSize).to.be.a("number");
    });
  });

  describe("listFunctions", function () {
    it("lists functions with callback pattern", function (done) {
      lambda.listFunctions({}, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Functions).to.be.an("array");

        // Store first function name for later tests
        if (data.Functions.length > 0) {
          existingFunctionName = data.Functions[0].FunctionName;
        }
        done();
      });
    });

    it("lists functions with promise pattern", async function () {
      const data = await lambda.listFunctions({}).promise();

      expect(data).to.be.an("object");
      expect(data.Functions).to.be.an("array");

      // Store first function name for later tests
      if (data.Functions.length > 0 && !existingFunctionName) {
        existingFunctionName = data.Functions[0].FunctionName;
      }
    });

    it("supports pagination with Marker", async function () {
      const data = await lambda.listFunctions({ MaxItems: 1 }).promise();

      expect(data).to.be.an("object");
      expect(data.Functions).to.be.an("array");
      // NextMarker may or may not exist depending on number of functions
    });
  });

  describe("getFunction", function () {
    it("gets function details with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      lambda.getFunction({ FunctionName: existingFunctionName }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Configuration).to.be.an("object");
        expect(data.Configuration.FunctionName).to.equal(existingFunctionName);
        expect(data.Configuration.FunctionArn).to.be.a("string");
        expect(data.Configuration.Runtime).to.be.a("string");
        done();
      });
    });

    it("gets function details with promise pattern", async function () {
      if (!existingFunctionName) {
        return this.skip();
      }

      const data = await lambda.getFunction({ FunctionName: existingFunctionName }).promise();

      expect(data).to.be.an("object");
      expect(data.Configuration).to.be.an("object");
      expect(data.Configuration.FunctionName).to.equal(existingFunctionName);
    });

    it("returns error with code for non-existent function", function (done) {
      lambda.getFunction({ FunctionName: "nonexistent-function-12345" }, (err) => {
        expect(err).to.be.an("error");
        expect(err.code).to.equal("ResourceNotFoundException");
        done();
      });
    });
  });

  describe("listVersionsByFunction", function () {
    it("lists versions with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      lambda.listVersionsByFunction({ FunctionName: existingFunctionName }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Versions).to.be.an("array");
        // $LATEST version should always exist
        const latestVersion = data.Versions.find((v) => v.Version === "$LATEST");
        expect(latestVersion).to.exist;
        done();
      });
    });

    it("lists versions with promise pattern", async function () {
      if (!existingFunctionName) {
        return this.skip();
      }

      const data = await lambda.listVersionsByFunction({ FunctionName: existingFunctionName }).promise();

      expect(data).to.be.an("object");
      expect(data.Versions).to.be.an("array");
    });
  });

  describe("listAliases", function () {
    it("lists aliases with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      lambda.listAliases({ FunctionName: existingFunctionName }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Aliases).to.be.an("array");
        done();
      });
    });

    it("lists aliases with promise pattern", async function () {
      if (!existingFunctionName) {
        return this.skip();
      }

      const data = await lambda.listAliases({ FunctionName: existingFunctionName }).promise();

      expect(data).to.be.an("object");
      expect(data.Aliases).to.be.an("array");
    });
  });

  describe("listTags", function () {
    it("lists tags with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      // Need to get the function ARN first
      lambda.getFunction({ FunctionName: existingFunctionName }, (err, fnData) => {
        if (err) return done(err);

        lambda.listTags({ Resource: fnData.Configuration.FunctionArn }, (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Tags).to.be.an("object");
          done();
        });
      });
    });

    it("lists tags with promise pattern", async function () {
      if (!existingFunctionName) {
        return this.skip();
      }

      const fnData = await lambda.getFunction({ FunctionName: existingFunctionName }).promise();
      const data = await lambda.listTags({ Resource: fnData.Configuration.FunctionArn }).promise();

      expect(data).to.be.an("object");
      expect(data.Tags).to.be.an("object");
    });
  });

  describe("getPolicy", function () {
    it("returns error or policy with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      lambda.getPolicy({ FunctionName: existingFunctionName }, (err, data) => {
        // Function may or may not have a policy
        if (err) {
          expect(err.code).to.equal("ResourceNotFoundException");
        } else {
          expect(data).to.be.an("object");
          expect(data.Policy).to.be.a("string");
        }
        done();
      });
    });
  });

  describe("invoke", function () {
    it("invokes a function with callback pattern (dry-run)", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      // Use DryRun to avoid actually invoking the function
      lambda.invoke(
        {
          FunctionName: existingFunctionName,
          InvocationType: "DryRun",
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.StatusCode).to.equal(204); // DryRun returns 204
          done();
        }
      );
    });

    it("invokes a function with promise pattern (dry-run)", async function () {
      if (!existingFunctionName) {
        return this.skip();
      }

      const data = await lambda
        .invoke({
          FunctionName: existingFunctionName,
          InvocationType: "DryRun",
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.StatusCode).to.equal(204);
    });
  });

  describe("getFunctionRecursionConfig", function () {
    it("gets recursion config with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      lambda.getFunctionRecursionConfig({ FunctionName: existingFunctionName }, (err, data) => {
        // This API may not be available in all regions/partitions
        if (err && err.code === "UnknownError") {
          return this.skip();
        }
        if (err) return done(err);

        expect(data).to.be.an("object");
        done();
      });
    });

    it("gets recursion config with promise pattern", async function () {
      if (!existingFunctionName) {
        return this.skip();
      }

      try {
        const data = await lambda.getFunctionRecursionConfig({ FunctionName: existingFunctionName }).promise();
        expect(data).to.be.an("object");
      } catch (err) {
        // This API may not be available in all regions/partitions
        if (err.code === "UnknownError" || err.code === "ServiceException") {
          return this.skip();
        }
        throw err;
      }
    });
  });

  describe("getAlias", function () {
    it("returns ResourceNotFoundException for non-existent alias", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      lambda.getAlias({ FunctionName: existingFunctionName, Name: "nonexistent-alias" }, (err) => {
        expect(err).to.be.an("error");
        expect(err.code).to.equal("ResourceNotFoundException");
        done();
      });
    });
  });
});
