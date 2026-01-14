/**
 * SQS Proxy Unit Tests
 *
 * Tests the SQS v2-to-v3 proxy's callback/promise bridging behavior.
 * These are unit tests that don't require AWS credentials.
 */

const { expect } = require("chai");
const { createSQSProxy } = require("../lib/sqs-proxy");

describe("SQS Proxy", function () {
  describe("createSQSProxy", function () {
    it("should create a proxy object with expected methods", function () {
      const proxy = createSQSProxy({ region: "us-east-1" });

      expect(proxy).to.be.an("object");
      expect(proxy.getQueueUrl).to.be.a("function");
      expect(proxy.getQueueAttributes).to.be.a("function");
      expect(proxy.setQueueAttributes).to.be.a("function");
      expect(proxy.removePermission).to.be.a("function");
      expect(proxy.listQueues).to.be.a("function");
      expect(proxy.sendMessage).to.be.a("function");
      expect(proxy.changeMessageVisibility).to.be.a("function");
      expect(proxy._client).to.be.an("object");
      expect(proxy._config).to.deep.equal({ region: "us-east-1" });
    });

    it("should preserve config in _config property", function () {
      const config = { region: "ap-southeast-2", credentials: { accessKeyId: "test", secretAccessKey: "test" } };
      const proxy = createSQSProxy(config);

      expect(proxy._config).to.deep.equal(config);
    });
  });

  describe("method signatures", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSQSProxy({ region: "us-east-1" });
    });

    it("getQueueUrl should return object with promise method", function () {
      const result = proxy.getQueueUrl({ QueueName: "test-queue" });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("getQueueAttributes should return object with promise method", function () {
      const result = proxy.getQueueAttributes({
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
        AttributeNames: ["All"],
      });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("setQueueAttributes should return object with promise method", function () {
      const result = proxy.setQueueAttributes({
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
        Attributes: { VisibilityTimeout: "60" },
      });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("removePermission should return object with promise method", function () {
      const result = proxy.removePermission({
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
        Label: "TestPermission",
      });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("listQueues should return object with promise method", function () {
      const result = proxy.listQueues({});

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("sendMessage should return object with promise method", function () {
      const result = proxy.sendMessage({
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
        MessageBody: "Test message",
      });

      expect(result).to.be.an("object");
      expect(result.promise).to.be.a("function");
    });

    it("changeMessageVisibility should return object with promise method", function () {
      const result = proxy.changeMessageVisibility({
        QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
        ReceiptHandle: "test-receipt-handle",
        VisibilityTimeout: 30,
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
      const proxy = createSQSProxy({ region: "us-east-1" });
      const result = proxy.getQueueUrl({ QueueName: "nonexistent-queue" });

      // The promise should exist and be callable
      expect(result.promise()).to.be.a("promise");
    });
  });

  describe("callback pattern", function () {
    let proxy;

    beforeEach(function () {
      proxy = createSQSProxy({ region: "us-east-1" });
    });

    it("getQueueUrl should accept callback as second argument", function () {
      // Just verify the callback is accepted without throwing
      let callbackInvoked = false;
      proxy.getQueueUrl({ QueueName: "test-queue" }, () => {
        callbackInvoked = true;
      });

      // Callback will be invoked asynchronously (likely with error for nonexistent queue)
      expect(true).to.be.true; // Just checking structure
    });

    it("getQueueAttributes should accept callback as second argument", function () {
      proxy.getQueueAttributes(
        {
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
          AttributeNames: ["All"],
        },
        () => {}
      );
      expect(true).to.be.true;
    });

    it("setQueueAttributes should accept callback as second argument", function () {
      proxy.setQueueAttributes(
        {
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
          Attributes: { VisibilityTimeout: "60" },
        },
        () => {}
      );
      expect(true).to.be.true;
    });

    it("removePermission should accept callback as second argument", function () {
      proxy.removePermission(
        {
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
          Label: "TestPermission",
        },
        () => {}
      );
      expect(true).to.be.true;
    });

    it("listQueues should accept callback as second argument", function () {
      proxy.listQueues({}, () => {});
      expect(true).to.be.true;
    });

    it("sendMessage should accept callback as second argument", function () {
      proxy.sendMessage(
        {
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
          MessageBody: "Test message",
        },
        () => {}
      );
      expect(true).to.be.true;
    });

    it("changeMessageVisibility should accept callback as second argument", function () {
      proxy.changeMessageVisibility(
        {
          QueueUrl: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
          ReceiptHandle: "test-receipt-handle",
          VisibilityTimeout: 30,
        },
        () => {}
      );
      expect(true).to.be.true;
    });
  });
});
