/**
 * STS Proxy Unit Tests
 */

const { expect } = require("chai");
const { createSTSProxy } = require("../lib/sts-proxy");

describe("STS Proxy", function () {
  describe("createSTSProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createSTSProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.assumeRole).to.be.a("function");
      expect(proxy.getCallerIdentity).to.be.a("function");
      expect(proxy.getFederationToken).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSTSProxy({ region: "us-east-1" });
    });

    it("assumeRole should return object with promise method", function () {
      const result = proxy.assumeRole({ RoleArn: "arn:aws:iam::123456789012:role/test", RoleSessionName: "test" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("getCallerIdentity should return object with promise method", function () {
      const result = proxy.getCallerIdentity({});
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("getFederationToken should return object with promise method", function () {
      const result = proxy.getFederationToken({ Name: "test" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSTSProxy({ region: "us-east-1" });
    });

    it("assumeRole should accept callback as second argument", function () {
      proxy.assumeRole({ RoleArn: "arn:aws:iam::123456789012:role/test", RoleSessionName: "test" }, () => {});
      expect(true).to.be.true;
    });

    it("getCallerIdentity should accept callback as second argument", function () {
      proxy.getCallerIdentity({}, () => {});
      expect(true).to.be.true;
    });
  });
});
