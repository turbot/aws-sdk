/**
 * SNS Proxy Unit Tests
 */

const { expect } = require("chai");
const { createSNSProxy } = require("../lib/sns-proxy");

describe("SNS Proxy", function () {
  describe("createSNSProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createSNSProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.publish).to.be.a("function");
      expect(proxy.subscribe).to.be.a("function");
      expect(proxy.createTopic).to.be.a("function");
      expect(proxy.deleteTopic).to.be.a("function");
      expect(proxy.setTopicAttributes).to.be.a("function");
      expect(proxy.getTopicAttributes).to.be.a("function");
      expect(proxy.tagResource).to.be.a("function");
      expect(proxy.listTopics).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSNSProxy({ region: "us-east-1" });
    });

    it("publish should return object with promise method", function () {
      const result = proxy.publish({ TopicArn: "arn:aws:sns:us-east-1:123456789012:test", Message: "test" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("subscribe should return object with promise method", function () {
      const result = proxy.subscribe({
        TopicArn: "arn:aws:sns:us-east-1:123456789012:test",
        Protocol: "lambda",
        Endpoint: "arn:aws:lambda:us-east-1:123456789012:function:test",
      });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("createTopic should return object with promise method", function () {
      const result = proxy.createTopic({ Name: "test-topic" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("deleteTopic should return object with promise method", function () {
      const result = proxy.deleteTopic({ TopicArn: "arn:aws:sns:us-east-1:123456789012:test" });
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("listTopics should return object with promise method", function () {
      const result = proxy.listTopics({});
      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSNSProxy({ region: "us-east-1" });
    });

    it("publish should accept callback as second argument", function () {
      proxy.publish({ TopicArn: "arn:aws:sns:us-east-1:123456789012:test", Message: "test" }, () => {});
      expect(true).to.be.true;
    });

    it("createTopic should accept callback as second argument", function () {
      proxy.createTopic({ Name: "test-topic" }, () => {});
      expect(true).to.be.true;
    });
  });
});
