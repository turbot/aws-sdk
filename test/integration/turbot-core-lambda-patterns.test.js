/**
 * turbot-core Lambda Usage Pattern Tests
 *
 * Tests the Lambda v3 proxy with actual patterns used in turbot-core.
 * Based on analysis of lib/@turbot/lambda/index.js and lib/@turbot/container-maintenance/src/lambda-cleanup.js
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const taws = require("../../index");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";

describe("turbot-core Lambda Patterns", function () {
  this.timeout(30000);

  let existingFunctionName;

  before(async function () {
    // Find an existing function to use for read-only tests
    const lambda = taws.connect("Lambda", { region: TEST_REGION });
    const result = await lambda.listFunctions({}).promise();
    if (result.Functions.length > 0) {
      existingFunctionName = result.Functions[0].FunctionName;
    }
  });

  describe("lambda/index.js pattern: getFunction", function () {
    // Pattern from lambda/index.js:3094
    // lambda.getFunction({ FunctionName }, (err, results) => {...})

    it("getFunction with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.getFunction({ FunctionName: existingFunctionName }, (err, results) => {
        if (err) return done(err);

        expect(results).to.be.an("object");
        expect(results.Configuration).to.be.an("object");
        expect(results.Configuration.FunctionName).to.equal(existingFunctionName);
        done();
      });
    });
  });

  describe("lambda/index.js pattern: getAlias with ResourceNotFoundException", function () {
    // Pattern from lambda/index.js:4144
    // lambda.getAlias({ FunctionName, Name }, (err, results) => {
    //   if (err && err.code === 'ResourceNotFoundException') { ... }
    // })

    it("getAlias returns ResourceNotFoundException for missing alias", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.getAlias({ FunctionName: existingFunctionName, Name: "nonexistent-alias-12345" }, (err) => {
        expect(err).to.be.an("error");
        expect(err.code).to.equal("ResourceNotFoundException");
        done();
      });
    });
  });

  describe("lambda/index.js pattern: getPolicy check", function () {
    // Pattern from lambda/index.js:4227
    // lambda.getPolicy({ FunctionName }, (err) => {
    //   // Error indicates no policy exists
    // })

    it("getPolicy returns error or policy object", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.getPolicy({ FunctionName: existingFunctionName }, (err, data) => {
        // Function may or may not have a policy
        if (err) {
          expect(err.code).to.equal("ResourceNotFoundException");
        } else {
          expect(data.Policy).to.be.a("string");
        }
        done();
      });
    });
  });

  describe("lambda/index.js pattern: getFunctionRecursionConfig", function () {
    // Pattern from lambda/index.js:3803
    // lambda.getFunctionRecursionConfig({ FunctionName }, (err, results) => {...})

    it("getFunctionRecursionConfig with callback pattern", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.getFunctionRecursionConfig({ FunctionName: existingFunctionName }, (err, results) => {
        // May not be available in all regions/partitions
        if (err && (err.code === "UnknownError" || err.code === "ServiceException")) {
          return this.skip();
        }
        if (err) return done(err);

        expect(results).to.be.an("object");
        done();
      });
    });
  });

  describe("container-maintenance pattern: listFunctions with pagination", function () {
    // Pattern from lambda-cleanup.js:20
    // lambda.listFunctions({ Marker }, (err, data) => {
    //   functions = functions.concat(data.Functions);
    //   marker = data.NextMarker;
    // })

    it("listFunctions returns Functions array and optional NextMarker", function (done) {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.listFunctions({}, (err, data) => {
        if (err) return done(err);

        expect(data.Functions).to.be.an("array");
        // NextMarker may or may not exist
        if (data.NextMarker) {
          expect(data.NextMarker).to.be.a("string");
        }
        done();
      });
    });

    it("listFunctions supports Marker parameter for pagination", async function () {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      const firstPage = await lambda.listFunctions({ MaxItems: 1 }).promise();

      expect(firstPage.Functions).to.be.an("array");

      if (firstPage.NextMarker) {
        const secondPage = await lambda.listFunctions({ Marker: firstPage.NextMarker, MaxItems: 1 }).promise();
        expect(secondPage.Functions).to.be.an("array");
      }
    });
  });

  describe("container-maintenance pattern: listVersionsByFunction with pagination", function () {
    // Pattern from lambda-cleanup.js:57
    // lambda.listVersionsByFunction({ FunctionName, Marker }, (err, data) => {
    //   versions = versions.concat(data.Versions);
    //   marker = data.NextMarker;
    // })

    it("listVersionsByFunction returns Versions array", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.listVersionsByFunction({ FunctionName: existingFunctionName }, (err, data) => {
        if (err) return done(err);

        expect(data.Versions).to.be.an("array");
        // $LATEST should always exist
        const latestVersion = data.Versions.find((v) => v.Version === "$LATEST");
        expect(latestVersion).to.exist;
        done();
      });
    });
  });

  describe("container-maintenance pattern: listAliases with pagination", function () {
    // Pattern from lambda-cleanup.js:90
    // lambda.listAliases({ FunctionName, FunctionVersion, Marker }, (err, data) => {
    //   aliases = aliases.concat(data.Aliases);
    //   marker = data.NextMarker;
    // })

    it("listAliases returns Aliases array", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.listAliases({ FunctionName: existingFunctionName }, (err, data) => {
        if (err) return done(err);

        expect(data.Aliases).to.be.an("array");
        done();
      });
    });
  });

  describe("connectivity-checker pattern: getAccountSettings", function () {
    // Pattern from turbot-connectivity-checker/main.js:318
    // lambda.getAccountSettings({}, (err) => {...})

    it("getAccountSettings with empty params", function (done) {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.getAccountSettings({}, (err, data) => {
        if (err) return done(err);

        expect(data.AccountLimit).to.be.an("object");
        expect(data.AccountUsage).to.be.an("object");
        done();
      });
    });
  });

  describe("lambda/index.js pattern: waitFor", function () {
    // Pattern from lambda/index.js:3769, 4092
    // lambda.waitFor('functionUpdated', { FunctionName }, (err) => {...})
    // lambda.waitFor('functionActive', { FunctionName }, (err) => {...})

    it("waitFor returns object with promise method for functionUpdated", function () {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      const result = lambda.waitFor("functionUpdated", { FunctionName: "test-function" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor returns object with promise method for functionActive", function () {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      const result = lambda.waitFor("functionActive", { FunctionName: "test-function" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor throws for unsupported state", function () {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      expect(() => lambda.waitFor("unsupportedState", { FunctionName: "test" })).to.throw("Unsupported waitFor state");
    });

    it("waitFor calls callback with error for unsupported state", function (done) {
      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.waitFor("unsupportedState", { FunctionName: "test" }, (err) => {
        expect(err).to.be.an("error");
        expect(err.message).to.include("Unsupported waitFor state");
        done();
      });
    });
  });

  describe("invoke pattern", function () {
    // Lambda invoke with Payload

    it("invoke returns StatusCode for DryRun", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      lambda.invoke(
        {
          FunctionName: existingFunctionName,
          InvocationType: "DryRun",
        },
        (err, data) => {
          if (err) return done(err);

          expect(data.StatusCode).to.equal(204);
          done();
        }
      );
    });
  });

  describe("listTags pattern", function () {
    // lambda.listTags({ Resource: functionArn })

    it("listTags returns Tags object", function (done) {
      if (!existingFunctionName) {
        return this.skip();
      }

      const lambda = taws.connect("Lambda", { region: TEST_REGION });

      // First get the function ARN
      lambda.getFunction({ FunctionName: existingFunctionName }, (err, fnData) => {
        if (err) return done(err);

        lambda.listTags({ Resource: fnData.Configuration.FunctionArn }, (err, data) => {
          if (err) return done(err);

          expect(data.Tags).to.be.an("object");
          done();
        });
      });
    });
  });
});
