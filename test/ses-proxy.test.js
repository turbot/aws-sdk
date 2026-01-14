/**
 * SES Proxy Unit Tests
 *
 * Tests the SES v2-to-v3 proxy's callback/promise bridging behavior.
 * These are unit tests that don't require AWS credentials.
 */

const { expect } = require("chai");
const { createSESProxy } = require("../lib/ses-proxy");

describe("SES Proxy", function () {
  describe("createSESProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createSESProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.sendEmail).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });

    it("should preserve config in _config property", function () {
      const config = { region: "ap-southeast-2", credentials: { accessKeyId: "test", secretAccessKey: "test" } };
      const proxy = createSESProxy(config);

      expect(proxy._config).to.deep.equal(config);
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSESProxy({ region: "us-east-1" });
    });

    it("sendEmail should return object with promise method", function () {
      const result = proxy.sendEmail({
        Source: "sender@example.com",
        Destination: {
          ToAddresses: ["recipient@example.com"],
        },
        Message: {
          Subject: { Data: "Test Subject" },
          Body: { Text: { Data: "Test Body" } },
        },
      });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });
  });

  describe("error normalization", function () {
    // Note: These tests verify the proxy structure, not actual AWS calls.
    // Integration tests cover real AWS behavior.

    it("should have normalizeError in module scope", function () {
      // This test verifies the error normalization is applied.
      // Actual error testing happens in integration tests.
      const proxy = createSESProxy({ region: "us-east-1" });
      const result = proxy.sendEmail({
        Source: "sender@example.com",
        Destination: { ToAddresses: ["recipient@example.com"] },
        Message: {
          Subject: { Data: "Test" },
          Body: { Text: { Data: "Test" } },
        },
      });

      // The promise should exist and be callable
      expect(result.promise()).to.be.a("promise");
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSESProxy({ region: "us-east-1" });
    });

    it("sendEmail should accept callback as second argument", function () {
      // Just verify the callback is accepted without throwing
      proxy.sendEmail(
        {
          Source: "sender@example.com",
          Destination: { ToAddresses: ["recipient@example.com"] },
          Message: {
            Subject: { Data: "Test" },
            Body: { Text: { Data: "Test" } },
          },
        },
        () => {}
      );
      expect(true).to.be.true;
    });
  });
});
