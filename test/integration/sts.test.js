/**
 * STS Proxy Integration Tests
 *
 * Tests the STS v3 proxy against real AWS STS.
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const { createSTSProxy } = require("../../lib/sts-proxy");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";

describe("STS Proxy Integration Tests", function () {
  // These tests hit real AWS, allow longer timeout
  this.timeout(30000);

  let sts;

  before(function () {
    // Create STS proxy with default credential chain
    sts = createSTSProxy({
      region: TEST_REGION,
    });
  });

  describe("getCallerIdentity", function () {
    it("returns caller identity with callback pattern", function (done) {
      sts.getCallerIdentity({}, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.UserId).to.be.a("string");
        expect(data.Account).to.be.a("string");
        expect(data.Arn).to.be.a("string");
        done();
      });
    });

    it("returns caller identity with promise pattern", async function () {
      const data = await sts.getCallerIdentity({}).promise();

      expect(data).to.be.an("object");
      expect(data.UserId).to.be.a("string");
      expect(data.Account).to.be.a("string");
      expect(data.Arn).to.be.a("string");
    });

    it("returns 12-digit account number", async function () {
      const data = await sts.getCallerIdentity({}).promise();
      expect(data.Account).to.match(/^\d{12}$/);
    });
  });

  describe("assumeRole", function () {
    // Skip assumeRole tests by default as they require a specific role ARN
    // These can be enabled when running against a specific test account
    it.skip("assumes role with callback pattern (requires test role)", function (done) {
      const testRoleArn = process.env.TEST_ROLE_ARN;
      if (!testRoleArn) {
        return this.skip();
      }

      sts.assumeRole(
        {
          RoleArn: testRoleArn,
          RoleSessionName: "sdk-integration-test",
          DurationSeconds: 900,
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Credentials).to.be.an("object");
          expect(data.Credentials.AccessKeyId).to.be.a("string");
          expect(data.Credentials.SecretAccessKey).to.be.a("string");
          expect(data.Credentials.SessionToken).to.be.a("string");
          expect(data.Credentials.Expiration).to.be.instanceOf(Date);
          done();
        }
      );
    });

    it("returns error with code for invalid role ARN", function (done) {
      sts.assumeRole(
        {
          RoleArn: "arn:aws:iam::123456789012:role/NonExistentRole",
          RoleSessionName: "sdk-integration-test",
        },
        (err) => {
          expect(err).to.be.an("error");
          // Error code can be AccessDenied, MalformedPolicyDocument, or similar
          expect(err.code).to.be.a("string");
          done();
        }
      );
    });
  });

  describe("getFederationToken", function () {
    // Skip federation token tests as they require specific IAM permissions
    it.skip("gets federation token with callback pattern (requires permissions)", function (done) {
      sts.getFederationToken(
        {
          Name: "sdk-test-user",
          DurationSeconds: 900,
          Policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Action: "s3:ListBucket",
                Resource: "*",
              },
            ],
          }),
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.Credentials).to.be.an("object");
          expect(data.FederatedUser).to.be.an("object");
          done();
        }
      );
    });
  });
});
