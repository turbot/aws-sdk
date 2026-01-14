/**
 * turbot-core KMS Usage Pattern Tests
 *
 * Tests the KMS v3 proxy with actual patterns used in turbot-core.
 * Based on analysis of lib/@turbot/encryption/index.js
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 * - Access to a KMS key (default: alias/aws/ssm)
 */

const { expect } = require("chai");
const taws = require("../../index");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";
const TEST_KEY_ALIAS = process.env.TEST_KMS_KEY || "alias/aws/ssm";
const SKIP_ENCRYPT_TESTS = !process.env.TEST_KMS_KEY;

describe("turbot-core KMS Patterns", function () {
  this.timeout(30000);

  describe("encryption/index.js pattern: generateDataKey + encrypt + decrypt", function () {
    // Pattern from encryption/index.js:116-130
    // kms.generateDataKey({ KeyId, KeySpec: "AES_256" }).promise()
    // Returns: { KeyId, CiphertextBlob, Plaintext }

    it("generateDataKey returns KeyId, CiphertextBlob, Plaintext with promise pattern", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const kms = taws.connect("KMS", { region: TEST_REGION });

      const data = await kms
        .generateDataKey({
          KeyId: TEST_KEY_ALIAS,
          KeySpec: "AES_256",
        })
        .promise();

      expect(data.KeyId).to.be.a("string");
      expect(data.CiphertextBlob).to.exist;
      expect(data.Plaintext).to.exist;

      // v3 returns Uint8Array, proxy should convert to Buffer for v2 compatibility
      expect(Buffer.isBuffer(data.CiphertextBlob)).to.be.true;
      expect(Buffer.isBuffer(data.Plaintext)).to.be.true;

      // AES_256 should be 32 bytes
      expect(data.Plaintext.length).to.equal(32);
    });

    // Pattern from encryption/index.js:163
    // kms.encrypt({ KeyId, Plaintext, EncryptionContext }).promise()
    it("encrypt with EncryptionContext using promise pattern", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const kms = taws.connect("KMS", { region: TEST_REGION });

      const encryptionContext = {
        tenantId: "test-tenant-123",
        purpose: "sdk-test",
      };

      const data = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("test-plaintext-data", "utf8"),
          EncryptionContext: encryptionContext,
        })
        .promise();

      expect(data.CiphertextBlob).to.exist;
      expect(Buffer.isBuffer(data.CiphertextBlob)).to.be.true;
    });

    // Pattern from encryption/index.js:46
    // kms.decrypt({ CiphertextBlob }).promise()
    // then: result.Plaintext.toString("utf8")
    it("decrypt returns Plaintext as Buffer for toString conversion", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const kms = taws.connect("KMS", { region: TEST_REGION });

      const testData = "test-plaintext-for-decrypt-" + Date.now();

      // First encrypt
      const encryptResult = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from(testData, "utf8"),
        })
        .promise();

      // Then decrypt
      const decryptResult = await kms
        .decrypt({
          CiphertextBlob: encryptResult.CiphertextBlob,
        })
        .promise();

      // turbot-core uses: result.Plaintext.toString("utf8")
      expect(Buffer.isBuffer(decryptResult.Plaintext)).to.be.true;
      expect(decryptResult.Plaintext.toString("utf8")).to.equal(testData);
    });
  });

  describe("connectivity-checker pattern: describeKey", function () {
    // Pattern from turbot-connectivity-checker/main.js:180
    // kms.describeKey({ KeyId }, (err) => {...})

    it("describeKey with callback pattern", function (done) {
      const kms = taws.connect("KMS", { region: TEST_REGION });

      kms.describeKey({ KeyId: TEST_KEY_ALIAS }, (err, data) => {
        if (err) return done(err);

        expect(data.KeyMetadata).to.exist;
        expect(data.KeyMetadata.KeyState).to.equal("Enabled");
        done();
      });
    });
  });

  describe("encryption context matching", function () {
    // turbot-core uses EncryptionContext for secure key binding
    // Decrypt must use same context as encrypt

    it("encrypt/decrypt with matching EncryptionContext", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const kms = taws.connect("KMS", { region: TEST_REGION });

      const context = {
        resourceId: "turbot:test:resource",
        action: "encrypt",
      };

      const encryptResult = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("context-bound-data", "utf8"),
          EncryptionContext: context,
        })
        .promise();

      const decryptResult = await kms
        .decrypt({
          CiphertextBlob: encryptResult.CiphertextBlob,
          EncryptionContext: context,
        })
        .promise();

      expect(decryptResult.Plaintext.toString("utf8")).to.equal("context-bound-data");
    });

    it("decrypt fails with wrong EncryptionContext", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const kms = taws.connect("KMS", { region: TEST_REGION });

      const encryptResult = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("context-test", "utf8"),
          EncryptionContext: { key: "value1" },
        })
        .promise();

      try {
        await kms
          .decrypt({
            CiphertextBlob: encryptResult.CiphertextBlob,
            EncryptionContext: { key: "value2" }, // Wrong context
          })
          .promise();
        expect.fail("Should have thrown an error");
      } catch (err) {
        expect(err.code).to.equal("InvalidCiphertextException");
      }
    });
  });

  describe("base64 handling pattern", function () {
    // turbot-core stores ciphertext as base64 strings

    it("supports base64 encoding/decoding of CiphertextBlob", async function () {
      if (SKIP_ENCRYPT_TESTS) return this.skip();
      const kms = taws.connect("KMS", { region: TEST_REGION });

      const encryptResult = await kms
        .encrypt({
          KeyId: TEST_KEY_ALIAS,
          Plaintext: Buffer.from("base64-test-data", "utf8"),
        })
        .promise();

      // Convert to base64 for storage (as turbot-core does)
      const base64Ciphertext = encryptResult.CiphertextBlob.toString("base64");
      expect(base64Ciphertext).to.be.a("string");

      // Convert back from base64 for decrypt
      const decryptResult = await kms
        .decrypt({
          CiphertextBlob: Buffer.from(base64Ciphertext, "base64"),
        })
        .promise();

      expect(decryptResult.Plaintext.toString("utf8")).to.equal("base64-test-data");
    });
  });
});
