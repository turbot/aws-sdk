/**
 * turbot-core STS Usage Pattern Tests
 *
 * Tests the STS v3 proxy with actual patterns used in turbot-core.
 * Based on analysis of lib/@turbot/graphql-execute/lib/queryResolvers/credentials/awsCredentials.js
 * and lib/@turbot/turbot-connectivity-checker/main.js
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const taws = require("../../index");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";

describe("turbot-core STS Patterns", function () {
  this.timeout(30000);

  describe("connectivity-checker pattern: getCallerIdentity", function () {
    // Pattern from turbot-connectivity-checker/main.js:237
    // sts.getCallerIdentity({}, (err) => {...})

    it("uses callback pattern with empty params", function (done) {
      const sts = taws.connect("STS", { region: TEST_REGION });

      sts.getCallerIdentity({}, (err) => {
        expect(err).to.be.null;
        done();
      });
    });

    it("returns UserId, Account, and Arn", function (done) {
      const sts = taws.connect("STS", { region: TEST_REGION });

      sts.getCallerIdentity({}, (err, data) => {
        if (err) return done(err);

        expect(data.UserId).to.be.a("string");
        expect(data.Account).to.be.a("string");
        expect(data.Arn).to.be.a("string");
        done();
      });
    });
  });

  describe("awsCredentials pattern: assumeRole", function () {
    // Pattern from graphql-execute/lib/queryResolvers/credentials/awsCredentials.js:274
    // sts.assumeRole(params, (err, data) => {
    //   if (err) { log.error(...); return callback(err); }
    //   const credentials = sts.credentialsFrom(data, {});
    //   ...
    // })

    it("returns error with code property for invalid role", function (done) {
      const sts = taws.connect("STS", { region: TEST_REGION });

      sts.assumeRole(
        {
          RoleArn: "arn:aws:iam::123456789012:role/NonExistentRole",
          RoleSessionName: "turbot-core-pattern-test",
          DurationSeconds: 900,
        },
        (err) => {
          // turbot-core checks err.code
          expect(err).to.be.an("error");
          expect(err.code).to.be.a("string");
          done();
        }
      );
    });

    it("handles RoleArn and RoleSessionName parameters", function (done) {
      const sts = taws.connect("STS", { region: TEST_REGION });

      // This will fail but should handle parameters correctly
      sts.assumeRole(
        {
          RoleArn: "arn:aws:iam::123456789012:role/TestRole",
          RoleSessionName: "turbot-sdk-test-session",
          DurationSeconds: 900,
          ExternalId: "test-external-id",
        },
        (err) => {
          // We expect an error for invalid role
          expect(err).to.exist;
          expect(err.code).to.be.a("string");
          done();
        }
      );
    });
  });

  describe("credential isolation pattern", function () {
    // turbot-core creates separate STS clients for different credential contexts

    it("creates independent STS clients with different configs", function () {
      const sts1 = taws.connect("STS", { region: "us-east-1" });
      const sts2 = taws.connect("STS", { region: "eu-west-1" });

      expect(sts1._config.region).to.equal("us-east-1");
      expect(sts2._config.region).to.equal("eu-west-1");

      // Should be independent instances
      expect(sts1._client).to.not.equal(sts2._client);
    });

    it("handles explicit credentials in config", function () {
      const sts = taws.connect("STS", {
        region: TEST_REGION,
        accessKeyId: "AKIAIOSFODNN7EXAMPLE",
        secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        sessionToken: "FwoGZXIvYXdzEBYaDCuXB...",
      });

      // Credentials should be passed through
      expect(sts._config.credentials).to.exist;
      expect(sts._config.credentials.accessKeyId).to.equal("AKIAIOSFODNN7EXAMPLE");
    });
  });
});
