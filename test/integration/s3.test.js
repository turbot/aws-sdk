/**
 * S3 Proxy Integration Tests
 *
 * These tests run against a real S3 bucket to verify the v3 proxy
 * maintains full compatibility with the v2 API patterns.
 *
 * Test bucket: turbot-aws-sdk-integration-test (ap-southeast-2)
 * AWS Profile: silverwater
 *
 * Run with: npm run test:integration
 */

const assert = require("chai").assert;
const { createS3Proxy } = require("../../lib/s3-proxy");
const { fromIni } = require("@aws-sdk/credential-providers");

const TEST_BUCKET = "turbot-aws-sdk-integration-test";
const TEST_REGION = "ap-southeast-2";
const TEST_PREFIX = `integration-test-${Date.now()}`;

describe("S3 Proxy Integration Tests", function () {
  this.timeout(30000); // S3 operations can be slow

  let s3;

  before(function () {
    // Use silverwater profile for credentials
    s3 = createS3Proxy({
      region: TEST_REGION,
      credentials: fromIni({ profile: "silverwater" }),
    });
  });

  after(async function () {
    // Clean up test objects
    try {
      const listResult = await s3
        .listObjectsV2({
          Bucket: TEST_BUCKET,
          Prefix: TEST_PREFIX,
        })
        .promise();

      if (listResult.Contents && listResult.Contents.length > 0) {
        await s3
          .deleteObjects({
            Bucket: TEST_BUCKET,
            Delete: {
              Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
            },
          })
          .promise();
      }
    } catch (err) {
      console.error("Cleanup error:", err.message);
    }
  });

  describe("putObject / getObject", function () {
    const testKey = `${TEST_PREFIX}/put-get-test.txt`;
    const testContent = "Hello from v3 proxy integration test!";

    it("putObject with callback", function (done) {
      s3.putObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: testContent,
          ContentType: "text/plain",
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          assert.exists(data.ETag);
          done();
        }
      );
    });

    it("getObject with callback returns Buffer body", function (done) {
      s3.getObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          assert.instanceOf(data.Body, Buffer);
          assert.equal(data.Body.toString(), testContent);
          done();
        }
      );
    });

    it("getObject with .promise()", async function () {
      const data = await s3
        .getObject({
          Bucket: TEST_BUCKET,
          Key: testKey,
        })
        .promise();

      assert.exists(data);
      assert.instanceOf(data.Body, Buffer);
      assert.equal(data.Body.toString(), testContent);
    });

    it("getObject with .createReadStream()", function (done) {
      const stream = s3
        .getObject({
          Bucket: TEST_BUCKET,
          Key: testKey,
        })
        .createReadStream();

      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("end", () => {
        const body = Buffer.concat(chunks).toString();
        assert.equal(body, testContent);
        done();
      });
      stream.on("error", done);
    });
  });

  describe("listObjectsV2", function () {
    it("lists objects with callback", function (done) {
      s3.listObjectsV2(
        {
          Bucket: TEST_BUCKET,
          Prefix: TEST_PREFIX,
          MaxKeys: 10,
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          assert.isArray(data.Contents);
          done();
        }
      );
    });

    it("lists objects with .promise()", async function () {
      const data = await s3
        .listObjectsV2({
          Bucket: TEST_BUCKET,
          Prefix: TEST_PREFIX,
          MaxKeys: 10,
        })
        .promise();

      assert.exists(data);
      assert.isArray(data.Contents);
    });
  });

  describe("headObject", function () {
    const testKey = `${TEST_PREFIX}/head-test.txt`;

    before(async function () {
      await s3
        .putObject({
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "head test content",
          ContentType: "text/plain",
        })
        .promise();
    });

    it("returns object metadata with callback", function (done) {
      s3.headObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          assert.exists(data.ContentLength);
          assert.equal(data.ContentType, "text/plain");
          done();
        }
      );
    });
  });

  describe("copyObject", function () {
    const sourceKey = `${TEST_PREFIX}/copy-source.txt`;
    const destKey = `${TEST_PREFIX}/copy-dest.txt`;

    before(async function () {
      await s3
        .putObject({
          Bucket: TEST_BUCKET,
          Key: sourceKey,
          Body: "content to copy",
        })
        .promise();
    });

    it("copies object with callback", function (done) {
      s3.copyObject(
        {
          Bucket: TEST_BUCKET,
          CopySource: `${TEST_BUCKET}/${sourceKey}`,
          Key: destKey,
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          assert.exists(data.CopyObjectResult);
          done();
        }
      );
    });
  });

  describe("deleteObject", function () {
    const testKey = `${TEST_PREFIX}/delete-test.txt`;

    before(async function () {
      await s3
        .putObject({
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "to be deleted",
        })
        .promise();
    });

    it("deletes object with callback", function (done) {
      s3.deleteObject(
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          done();
        }
      );
    });
  });

  describe("deleteObjects", function () {
    const keys = [
      `${TEST_PREFIX}/batch-delete-1.txt`,
      `${TEST_PREFIX}/batch-delete-2.txt`,
      `${TEST_PREFIX}/batch-delete-3.txt`,
    ];

    before(async function () {
      for (const key of keys) {
        await s3
          .putObject({
            Bucket: TEST_BUCKET,
            Key: key,
            Body: "batch delete test",
          })
          .promise();
      }
    });

    it("deletes multiple objects with callback", function (done) {
      s3.deleteObjects(
        {
          Bucket: TEST_BUCKET,
          Delete: {
            Objects: keys.map((Key) => ({ Key })),
          },
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          assert.isArray(data.Deleted);
          assert.equal(data.Deleted.length, keys.length);
          done();
        }
      );
    });
  });

  describe("getSignedUrl", function () {
    const testKey = `${TEST_PREFIX}/signed-url-test.txt`;

    before(async function () {
      await s3
        .putObject({
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: "signed url content",
        })
        .promise();
    });

    it("generates signed URL with callback", function (done) {
      s3.getSignedUrl(
        "getObject",
        {
          Bucket: TEST_BUCKET,
          Key: testKey,
          Expires: 60,
        },
        (err, url) => {
          assert.isNull(err);
          assert.isString(url);
          assert.include(url, TEST_BUCKET);
          assert.include(url, testKey);
          done();
        }
      );
    });

    it("generates signed URL as promise", async function () {
      const url = await s3.getSignedUrl("getObject", {
        Bucket: TEST_BUCKET,
        Key: testKey,
        Expires: 60,
      });

      assert.isString(url);
      assert.include(url, TEST_BUCKET);
    });
  });

  describe("upload (multipart)", function () {
    const testKey = `${TEST_PREFIX}/upload-test.txt`;
    const largeContent = "x".repeat(1024 * 1024); // 1MB

    it("uploads with .promise()", async function () {
      const result = await s3
        .upload({
          Bucket: TEST_BUCKET,
          Key: testKey,
          Body: largeContent,
        })
        .promise();

      assert.exists(result);
      assert.exists(result.Location);
      assert.include(result.Key, testKey);
    });

    it("uploads with callback", function (done) {
      s3.upload(
        {
          Bucket: TEST_BUCKET,
          Key: `${testKey}-cb`,
          Body: "callback upload content",
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          done();
        }
      );
    });
  });

  describe("getBucketLocation", function () {
    it("returns bucket location with callback", function (done) {
      s3.getBucketLocation(
        {
          Bucket: TEST_BUCKET,
        },
        (err, data) => {
          assert.isNull(err);
          assert.exists(data);
          // ap-southeast-2 returns "ap-southeast-2" or may be empty for us-east-1
          done();
        }
      );
    });
  });

  describe("error handling", function () {
    it("returns error for non-existent object", function (done) {
      s3.getObject(
        {
          Bucket: TEST_BUCKET,
          Key: "this-key-does-not-exist-12345",
        },
        (err, data) => {
          assert.exists(err);
          assert.equal(err.code, "NoSuchKey");
          assert.isUndefined(data);
          done();
        }
      );
    });

    it("error has code property (v2 compat)", async function () {
      try {
        await s3
          .getObject({
            Bucket: TEST_BUCKET,
            Key: "this-key-does-not-exist-12345",
          })
          .promise();
        assert.fail("Should have thrown");
      } catch (err) {
        assert.exists(err.code);
        assert.equal(err.code, "NoSuchKey");
      }
    });
  });
});
