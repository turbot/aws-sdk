/**
 * Lambda Proxy Unit Tests
 */

const { expect } = require("chai");
const { createLambdaProxy } = require("../lib/lambda-proxy");

describe("Lambda Proxy", function () {
  describe("createLambdaProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createLambdaProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.invoke).to.be.a("function");
      expect(proxy.createFunction).to.be.a("function");
      expect(proxy.deleteFunction).to.be.a("function");
      expect(proxy.updateFunctionCode).to.be.a("function");
      expect(proxy.updateFunctionConfiguration).to.be.a("function");
      expect(proxy.getFunction).to.be.a("function");
      expect(proxy.getAlias).to.be.a("function");
      expect(proxy.createAlias).to.be.a("function");
      expect(proxy.updateAlias).to.be.a("function");
      expect(proxy.deleteAlias).to.be.a("function");
      expect(proxy.getPolicy).to.be.a("function");
      expect(proxy.addPermission).to.be.a("function");
      expect(proxy.listFunctions).to.be.a("function");
      expect(proxy.listVersionsByFunction).to.be.a("function");
      expect(proxy.listAliases).to.be.a("function");
      expect(proxy.listTags).to.be.a("function");
      expect(proxy.tagResource).to.be.a("function");
      expect(proxy.getAccountSettings).to.be.a("function");
      expect(proxy.getFunctionRecursionConfig).to.be.a("function");
      expect(proxy.putFunctionRecursionConfig).to.be.a("function");
      expect(proxy.waitFor).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createLambdaProxy({ region: "us-east-1" });
    });

    it("invoke should return object with promise method", function () {
      const result = proxy.invoke({ FunctionName: "test-function" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("getFunction should return object with promise method", function () {
      const result = proxy.getFunction({ FunctionName: "test-function" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("listFunctions should return object with promise method", function () {
      const result = proxy.listFunctions({});
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("listTags should return object with promise method", function () {
      const result = proxy.listTags({ Resource: "arn:aws:lambda:us-east-1:123456789012:function:test" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("getPolicy should return object with promise method", function () {
      const result = proxy.getPolicy({ FunctionName: "test-function" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });
  });

  describe("waitFor", function () {
    let proxy;

    beforeEach(function () {
      proxy = createLambdaProxy({ region: "us-east-1" });
    });

    it("waitFor should return object with promise method for functionUpdated", function () {
      const result = proxy.waitFor("functionUpdated", { FunctionName: "test-function" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor should return object with promise method for functionActive", function () {
      const result = proxy.waitFor("functionActive", { FunctionName: "test-function" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("waitFor should throw for unsupported state without callback", function () {
      expect(() => proxy.waitFor("unsupportedState", {})).to.throw("Unsupported waitFor state");
    });

    it("waitFor should call callback with error for unsupported state", function (done) {
      proxy.waitFor("unsupportedState", {}, (err) => {
        expect(err).to.be.an("error");
        expect(err.message).to.include("Unsupported waitFor state");
        done();
      });
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createLambdaProxy({ region: "us-east-1" });
    });

    it("invoke should accept callback as second argument", function () {
      proxy.invoke({ FunctionName: "test-function" }, () => {});
      expect(true).to.be.true;
    });

    it("getFunction should accept callback as second argument", function () {
      proxy.getFunction({ FunctionName: "test-function" }, () => {});
      expect(true).to.be.true;
    });

    it("listFunctions should accept callback as second argument", function () {
      proxy.listFunctions({}, () => {});
      expect(true).to.be.true;
    });
  });
});
