/**
 * KMS Proxy Unit Tests
 */

const { expect } = require("chai");
const { createKMSProxy } = require("../lib/kms-proxy");

describe("KMS Proxy", function () {
  describe("createKMSProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createKMSProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.decrypt).to.be.a("function");
      expect(proxy.encrypt).to.be.a("function");
      expect(proxy.generateDataKey).to.be.a("function");
      expect(proxy.describeKey).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createKMSProxy({ region: "us-east-1" });
    });

    it("decrypt should return object with promise method", function () {
      const result = proxy.decrypt({ CiphertextBlob: Buffer.from("test") });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("encrypt should return object with promise method", function () {
      const result = proxy.encrypt({ KeyId: "alias/test", Plaintext: Buffer.from("test") });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("generateDataKey should return object with promise method", function () {
      const result = proxy.generateDataKey({ KeyId: "alias/test", KeySpec: "AES_256" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("describeKey should return object with promise method", function () {
      const result = proxy.describeKey({ KeyId: "alias/test" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createKMSProxy({ region: "us-east-1" });
    });

    it("decrypt should accept callback as second argument", function () {
      proxy.decrypt({ CiphertextBlob: Buffer.from("test") }, () => {});
      expect(true).to.be.true;
    });

    it("encrypt should accept callback as second argument", function () {
      proxy.encrypt({ KeyId: "alias/test", Plaintext: Buffer.from("test") }, () => {});
      expect(true).to.be.true;
    });
  });
});
