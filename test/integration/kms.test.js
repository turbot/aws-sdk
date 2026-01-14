/**
 * KMS Proxy Integration Tests
 *
 * Tests the KMS v3 proxy against real AWS KMS.
 * Uses an existing KMS key alias for testing (default aws/ssm).
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 * - Access to a KMS key (default: alias/aws/ssm)
 */

const { expect } = require("chai");
const { createKMSProxy } = require("../../lib/kms-proxy");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";
// Use test key from environment or skip encrypt/decrypt tests
// The aws/ssm service key doesn't allow encrypt operations for users
const TEST_KEY_ALIAS = process.env.TEST_KMS_KEY || "alias/aws/ssm";
const SKIP_ENCRYPT_TESTS = !process.env.TEST_KMS_KEY;

describe("KMS Proxy Integration Tests", function () {
  // These tests hit real AWS, allow longer timeout
  this.timeout(30000);

  let kms;

  before(function () {
    // Create KMS proxy with default credential chain
    kms = createKMSProxy({
      region: TEST_REGION,
    });
  });

  describe("describeKey", function () {
    it("describes a key with callback pattern", function (done) {
      kms.describeKey({ KeyId: TEST_KEY_ALIAS }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.KeyMetadata).to.be.an("object");
        expect(data.KeyMetadata.KeyId).to.be.a("string");
        expect(data.KeyMetadata.Arn).to.be.a("string");
        expect(data.KeyMetadata.KeyState).to.equal("Enabled");
        done();
      });
    });

    it("describes a key with promise pattern", async function () {
      const data = await kms.describeKey({ KeyId: TEST_KEY_ALIAS }).promise();

      expect(data).to.be.an("object");
      expect(data.KeyMetadata).to.be.an("object");
      expect(data.KeyMetadata.KeyId).to.be.a("string");
    });

    it("returns error with code for non-existent key", function (done) {
      kms.describeKey(
        {
          KeyId: "arn:aws:kms:us-east-1:123456789012:key/00000000-0000-0000-0000-000000000000",
        },
        (err) => {
          expect(err).to.be.an("error");
          expect(err.code).to.be.a("string");
          done();
        }
      );
    });
  });

  describe("encrypt and decrypt", function () {
    const testPlaintext = "test-data-for-encryption-" + Date.now();
    let encryptedBlob;

    before(function () {
      if (SKIP_ENCRYPT_TESTS) {
        console.log("Skipping encrypt/decrypt tests - set TEST_KMS_KEY to a key with encrypt permissions");
      }
    });

    it("encrypts data with promise pattern", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const data = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from(testPlaintext, "utf8"),
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.CiphertextBlob).to.exist;
      expect(data.KeyId).to.be.a("string");

      // Store for decrypt test
      encryptedBlob = data.CiphertextBlob;

      // v3 returns Uint8Array, proxy should convert to Buffer
      expect(Buffer.isBuffer(data.CiphertextBlob)).to.be.true;
    });

    it("encrypts data with callback pattern", function (done) {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      kms.encrypt(
        {
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("callback-test-data", "utf8"),
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.CiphertextBlob).to.exist;
          expect(Buffer.isBuffer(data.CiphertextBlob)).to.be.true;
          done();
        }
      );
    });

    it("decrypts data with promise pattern", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      // Use the blob from the encrypt test
      if (!encryptedBlob) {
        const encryptResult = await kms
          .encrypt({
            KeyId: TEST_KEY_ALIAS,
            Plaintext: Buffer.from(testPlaintext, "utf8"),
          })
          .promise();
        encryptedBlob = encryptResult.CiphertextBlob;
      }

      const data = await kms
        .decrypt({
          CiphertextBlob: encryptedBlob,
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.Plaintext).to.exist;
      expect(Buffer.isBuffer(data.Plaintext)).to.be.true;

      const decryptedText = data.Plaintext.toString("utf8");
      expect(decryptedText).to.equal(testPlaintext);
    });

    it("decrypts data with callback pattern", function (done) {
      if (SKIP_ENCRYPT_TESTS || !encryptedBlob) {
        return this.skip();
      }

      kms.decrypt({ CiphertextBlob: encryptedBlob }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Plaintext).to.exist;
        expect(Buffer.isBuffer(data.Plaintext)).to.be.true;
        done();
      });
    });
  });

  describe("generateDataKey", function () {
    it("generates a data key with promise pattern", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const data = await kms
        .generateDataKey({
          KeyId: TEST_KEY_ALIAS,
          KeySpec: "AES_256",
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.CiphertextBlob).to.exist;
      expect(data.Plaintext).to.exist;
      expect(data.KeyId).to.be.a("string");

      // v3 returns Uint8Array, proxy should convert to Buffer
      expect(Buffer.isBuffer(data.CiphertextBlob)).to.be.true;
      expect(Buffer.isBuffer(data.Plaintext)).to.be.true;

      // AES_256 key should be 32 bytes
      expect(data.Plaintext.length).to.equal(32);
    });

    it("generates a data key with callback pattern", function (done) {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      kms.generateDataKey(
        {
          KeyId: TEST_KEY_ALIAS,
          KeySpec: "AES_256",
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.CiphertextBlob).to.exist;
          expect(data.Plaintext).to.exist;
          expect(Buffer.isBuffer(data.CiphertextBlob)).to.be.true;
          expect(Buffer.isBuffer(data.Plaintext)).to.be.true;
          done();
        }
      );
    });

    it("generates AES_128 data key", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const data = await kms
        .generateDataKey({
          KeyId: TEST_KEY_ALIAS,
          KeySpec: "AES_128",
        })
        .promise();

      // AES_128 key should be 16 bytes
      expect(data.Plaintext.length).to.equal(16);
    });
  });

  describe("encryption context", function () {
    it("encrypts with encryption context", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const context = {
        purpose: "sdk-test",
        timestamp: String(Date.now()),
      };

      const encryptResult = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("context-test-data", "utf8"),
          EncryptionContext: context,
        })
        .promise();

      expect(encryptResult.CiphertextBlob).to.exist;

      // Decrypt with same context should work
      const decryptResult = await kms
        .decrypt({
          CiphertextBlob: encryptResult.CiphertextBlob,
          EncryptionContext: context,
        })
        .promise();

      expect(decryptResult.Plaintext.toString("utf8")).to.equal("context-test-data");
    });

    it("decrypt fails without matching encryption context", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const context = {
        purpose: "sdk-test",
        timestamp: String(Date.now()),
      };

      const encryptResult = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("context-test-data", "utf8"),
          EncryptionContext: context,
        })
        .promise();

      // Decrypt without context should fail
      try {
        await kms
          .decrypt({
            CiphertextBlob: encryptResult.CiphertextBlob,
            // No EncryptionContext provided
          })
          .promise();
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err.code).to.equal("InvalidCiphertextException");
      }
    });
  });
});
