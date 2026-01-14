/**
 * Integration tests that mimic turbot-core S3 usage patterns.
 *
 * These tests verify that the v3 proxy works with the exact calling patterns
 * found in turbot-core code. Each test references the source file where the
 * pattern was found.
 *
 * Requires AWS credentials and the test bucket:
 *   npm run test:integration
 */

const assert = require("chai").assert;
const taws = require("../..");

const TEST_BUCKET = "turbot-aws-sdk-integration-test";
const TEST_REGION = "ap-southeast-2";

describe("turbot-core S3 usage patterns", function () {
  this.timeout(30000);

  // Clean up test objects after each test
  const testKeys = [];
  afterEach(async function () {
    if (testKeys.length === 0) return;
    const s3 = taws.connect("S3", { region: TEST_REGION });
    for (const key of testKeys) {
      try {
        await s3.deleteObject({ Bucket: TEST_BUCKET, Key: key }).promise();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    testKeys.length = 0;
  });

  describe("Pattern: connect with region only", function () {
    // From: lib/@turbot/events/lib/commands/large_command.js:75
    // const s3 = taws.connect("S3", { region: tProcess.region });

    it("getObject with callback (large_command.js:76)", function (done) {
      const testKey = `test-pattern-region-${Date.now()}.json`;
      testKeys.push(testKey);

      const s3 = taws.connect("S3", { region: TEST_REGION });

      // First put an object
      s3.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: JSON.stringify({ test: "data" }),
          ContentType: "application/json",
        },
        (err) => {
          assert.isNull(err);

          // Then get it back - this is the pattern from large_command.js
          const params = { Bucket: TEST_BUCKET, Key: testKey };
          s3.getObject(params, (err, s3Object) => {
            assert.isNull(err);
            assert.exists(s3Object.Body);
            // Body should be a Buffer
            assert.instanceOf(s3Object.Body, Buffer);
            const data = JSON.parse(s3Object.Body.toString());
            assert.deepEqual(data, { test: "data" });
            done();
          });
        }
      );
    });
  });

  describe("Pattern: connect with no params", function () {
    // From: lib/@turbot/turbot-workspace-manager/main.js:226
    // const s3 = taws.connect("S3");

    it("putObject with callback (turbot-workspace/main.js:368)", function (done) {
      const testKey = `test-pattern-noparams-${Date.now()}.json`;
      testKeys.push(testKey);

      // Set region via env var (how it works in Lambda)
      const originalRegion = process.env.AWS_DEFAULT_REGION;
      process.env.AWS_DEFAULT_REGION = TEST_REGION;

      const s3 = taws.connect("S3");

      const params = {
        Bucket: TEST_BUCKET,
        Key: testKey,
        Body: JSON.stringify({ output: "test" }),
      };

      s3.putObject(params, (err) => {
        process.env.AWS_DEFAULT_REGION = originalRegion;
        assert.isNull(err);
        done();
      });
    });
  });

  describe("Pattern: connect with credentials", function () {
    // From: lib/@turbot/internal-utils/lib/event.js:50
    // const s3 = taws.connect("S3", {
    //   region: regionToUse,
    //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    //   sessionToken: process.env.AWS_SESSION_TOKEN,
    // });

    it("getObject with explicit credentials (event.js:50)", function (done) {
      const testKey = `test-pattern-creds-${Date.now()}.json`;
      testKeys.push(testKey);

      // First create the object
      const s3Setup = taws.connect("S3", { region: TEST_REGION });
      s3Setup.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "test content",
        },
        (err) => {
          assert.isNull(err);

          // Now test with explicit credentials (from env)
          const s3 = taws.connect("S3", {
            region: TEST_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN,
          });

          s3.getObject({ Bucket: TEST_BUCKET, Key: testKey }, (err, data) => {
            assert.isNull(err);
            assert.exists(data.Body);
            done();
          });
        }
      );
    });
  });

  describe("Pattern: connect with retryDelayOptions", function () {
    // From: lib/@turbot/lambda/index.js:3398
    // const s3 = taws.connect("S3", {
    //   retryDelayOptions: {
    //     customBackoff: taws.customBackoff,
    //   },
    // });

    it("getObject with retry options (lambda/index.js:3398)", function (done) {
      const testKey = `test-pattern-retry-${Date.now()}.json`;
      testKeys.push(testKey);

      // First create the object
      const s3Setup = taws.connect("S3", { region: TEST_REGION });
      s3Setup.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "retry test",
        },
        (err) => {
          assert.isNull(err);

          // This is the pattern from lambda/index.js - note: retryDelayOptions
          // is a v2 param that we may need to handle differently in v3
          const s3 = taws.connect("S3", {
            region: TEST_REGION,
            retryDelayOptions: {
              customBackoff: taws.customBackoff,
            },
          });

          s3.getObject({ Bucket: TEST_BUCKET, Key: testKey }, (err, data) => {
            assert.isNull(err);
            assert.exists(data.Body);
            done();
          });
        }
      );
    });
  });

  describe("Pattern: upload with callback", function () {
    // From: lib/@turbot/data-utils/index.js:1470
    // s3.upload(params, (err, data) => {
    //   callback(err, data);
    // });

    it("upload with callback (data-utils/index.js:1470)", function (done) {
      const testKey = `test-pattern-upload-${Date.now()}.zip`;
      testKeys.push(testKey);

      const s3 = taws.connect("S3", { region: TEST_REGION });

      const params = {
        Bucket: TEST_BUCKET,
        Key: testKey,
        Body: Buffer.from("fake zip content"),
        ContentType: "application/zip",
      };

      s3.upload(params, (err, data) => {
        assert.isNull(err);
        assert.exists(data);
        assert.exists(data.Location);
        done();
      });
    });
  });

  describe("Pattern: getSignedUrl with callback", function () {
    // From: lib/@turbot/graphql-execute/lib/mutationResolvers/mod/uploadMod.js:174
    // s3.getSignedUrl("putObject", params, function (err, url) {

    it("getSignedUrl putObject with callback (uploadMod.js:174)", function (done) {
      const s3 = taws.connect("S3", { region: TEST_REGION });

      const params = {
        Bucket: TEST_BUCKET,
        Key: `test-signed-url-${Date.now()}.json`,
        ContentType: "application/json",
        Expires: 600,
      };

      s3.getSignedUrl("putObject", params, function (err, url) {
        assert.isNull(err);
        assert.isString(url);
        assert.include(url, TEST_BUCKET);
        assert.include(url, "X-Amz-Signature");
        done();
      });
    });

    // From: lib/@turbot/events/lib/run/run.js:1740
    // Expires: 4 * 60 * 60, // in seconds -> 4 hours

    it("getSignedUrl getObject with long expiry (run.js:1740)", function (done) {
      const testKey = `test-signed-get-${Date.now()}.json`;
      testKeys.push(testKey);

      const s3 = taws.connect("S3", { region: TEST_REGION });

      // First create an object to sign
      s3.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "signed url test",
        },
        (err) => {
          assert.isNull(err);

          const params = {
            Bucket: TEST_BUCKET,
            Key: testKey,
            Expires: 4 * 60 * 60, // 4 hours
          };

          s3.getSignedUrl("getObject", params, function (err, url) {
            assert.isNull(err);
            assert.isString(url);
            assert.include(url, TEST_BUCKET);
            done();
          });
        }
      );
    });
  });

  describe("Pattern: new taws.connect (instantiation style)", function () {
    // From: lib/@turbot/container-maintenance/src/process-cleanup.js:245
    // const s3 = new taws.connect("S3", { ... });
    // Note: This is technically incorrect usage but it works in v2

    it("new taws.connect still works (process-cleanup.js:245)", function (done) {
      const testKey = `test-pattern-new-${Date.now()}.json`;
      testKeys.push(testKey);

      // This pattern uses 'new' which is unusual but appears in the codebase
      const s3 = new taws.connect("S3", {
        region: TEST_REGION,
        retryDelayOptions: {
          customBackoff: taws.customBackoff,
        },
      });

      s3.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "new pattern test",
        },
        (err) => {
          assert.isNull(err);
          done();
        }
      );
    });
  });

  describe("Pattern: createReadStream", function () {
    // From: lib/@turbot/data-utils/index.js:1528-1540
    // const stream = s3.getObject(params).createReadStream();

    it("getObject().createReadStream() (data-utils/index.js:1528)", function (done) {
      const testKey = `test-pattern-stream-${Date.now()}.json`;
      testKeys.push(testKey);

      const s3 = taws.connect("S3", { region: TEST_REGION });

      // First create the object
      s3.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: JSON.stringify({ stream: "test" }),
        },
        (err) => {
          assert.isNull(err);

          // Now read it with createReadStream
          const params = {
            Bucket: TEST_BUCKET,
            Key: testKey,
          };

          const chunks = [];
          const stream = s3.getObject(params).createReadStream();

          stream.on("data", (chunk) => chunks.push(chunk));
          stream.on("end", () => {
            const body = Buffer.concat(chunks).toString();
            const data = JSON.parse(body);
            assert.deepEqual(data, { stream: "test" });
            done();
          });
          stream.on("error", done);
        }
      );
    });
  });

  describe("Error handling patterns", function () {
    // Various error handling patterns check err.code

    it("error has code property for non-existent object", function (done) {
      const s3 = taws.connect("S3", { region: TEST_REGION });

      s3.getObject(
        {
          Bucket: TEST_BUCKET,
          Key: "non-existent-key-" + Date.now(),
        },
        (err) => {
          assert.exists(err);
          assert.exists(err.code);
          assert.equal(err.code, "NoSuchKey");
          done();
        }
      );
    });

    it("error has code property via promise rejection", function (done) {
      const s3 = taws.connect("S3", { region: TEST_REGION });

      s3.getObject({
        Bucket: TEST_BUCKET,
        Key: "non-existent-key-" + Date.now(),
      })
        .promise()
        .catch((err) => {
          assert.exists(err);
          assert.exists(err.code);
          assert.equal(err.code, "NoSuchKey");
          done();
        });
    });
  });
});
