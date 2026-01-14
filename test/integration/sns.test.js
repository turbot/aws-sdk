/**
 * SNS Proxy Integration Tests
 *
 * Tests the SNS v3 proxy against real AWS SNS.
 * Creates test topics with a specific prefix for cleanup.
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const { createSNSProxy } = require("../../lib/sns-proxy");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";
const TEST_PREFIX = "turbot-sdk-test";
const TEST_TOPIC_NAME = `${TEST_PREFIX}-${Date.now()}`;

describe("SNS Proxy Integration Tests", function () {
  // These tests hit real AWS, allow longer timeout
  this.timeout(30000);

  let sns;
  let testTopicArn;

  before(function () {
    // Create SNS proxy with default credential chain
    sns = createSNSProxy({
      region: TEST_REGION,
    });
  });

  describe("listTopics", function () {
    it("lists topics with callback pattern", function (done) {
      sns.listTopics({}, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Topics).to.be.an("array");
        done();
      });
    });

    it("lists topics with promise pattern", async function () {
      const data = await sns.listTopics({}).promise();

      expect(data).to.be.an("object");
      expect(data.Topics).to.be.an("array");
    });
  });

  describe("createTopic", function () {
    it("creates a topic with callback pattern", function (done) {
      const topicName = `${TEST_TOPIC_NAME}-callback`;

      sns.createTopic({ Name: topicName }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.TopicArn).to.be.a("string");
        expect(data.TopicArn).to.include(topicName);

        // Store for later tests
        testTopicArn = data.TopicArn;
        done();
      });
    });

    it("creates a topic with promise pattern", async function () {
      const topicName = `${TEST_TOPIC_NAME}-promise`;
      const data = await sns.createTopic({ Name: topicName }).promise();

      expect(data).to.be.an("object");
      expect(data.TopicArn).to.be.a("string");
      expect(data.TopicArn).to.include(topicName);
    });

    it("returns same ARN for existing topic (idempotent)", async function () {
      if (!testTopicArn) {
        return this.skip();
      }

      // Extract topic name from ARN
      const topicName = testTopicArn.split(":").pop();
      const data = await sns.createTopic({ Name: topicName }).promise();

      expect(data.TopicArn).to.equal(testTopicArn);
    });
  });

  describe("getTopicAttributes", function () {
    it("gets topic attributes with callback pattern", function (done) {
      if (!testTopicArn) {
        return this.skip();
      }

      sns.getTopicAttributes({ TopicArn: testTopicArn }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        expect(data.Attributes).to.be.an("object");
        expect(data.Attributes.TopicArn).to.equal(testTopicArn);
        done();
      });
    });

    it("gets topic attributes with promise pattern", async function () {
      if (!testTopicArn) {
        return this.skip();
      }

      const data = await sns.getTopicAttributes({ TopicArn: testTopicArn }).promise();

      expect(data).to.be.an("object");
      expect(data.Attributes).to.be.an("object");
      expect(data.Attributes.TopicArn).to.equal(testTopicArn);
    });

    it("returns error with code for non-existent topic", function (done) {
      sns.getTopicAttributes(
        {
          TopicArn: `arn:aws:sns:${TEST_REGION}:123456789012:nonexistent-topic`,
        },
        (err) => {
          expect(err).to.be.an("error");
          expect(err.code).to.be.a("string");
          done();
        }
      );
    });
  });

  describe("setTopicAttributes", function () {
    it("sets topic attributes with callback pattern", function (done) {
      if (!testTopicArn) {
        return this.skip();
      }

      sns.setTopicAttributes(
        {
          TopicArn: testTopicArn,
          AttributeName: "DisplayName",
          AttributeValue: "SDK Test Topic",
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          done();
        }
      );
    });

    it("sets topic attributes with promise pattern", async function () {
      if (!testTopicArn) {
        return this.skip();
      }

      const data = await sns
        .setTopicAttributes({
          TopicArn: testTopicArn,
          AttributeName: "DisplayName",
          AttributeValue: "SDK Test Topic Promise",
        })
        .promise();

      expect(data).to.be.an("object");
    });
  });

  describe("publish", function () {
    it("publishes a message with callback pattern", function (done) {
      if (!testTopicArn) {
        return this.skip();
      }

      sns.publish(
        {
          TopicArn: testTopicArn,
          Message: "Test message from SDK integration test (callback)",
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          expect(data.MessageId).to.be.a("string");
          done();
        }
      );
    });

    it("publishes a message with promise pattern", async function () {
      if (!testTopicArn) {
        return this.skip();
      }

      const data = await sns
        .publish({
          TopicArn: testTopicArn,
          Message: "Test message from SDK integration test (promise)",
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.MessageId).to.be.a("string");
    });

    it("publishes with message attributes", async function () {
      if (!testTopicArn) {
        return this.skip();
      }

      const data = await sns
        .publish({
          TopicArn: testTopicArn,
          Message: "Test message with attributes",
          MessageAttributes: {
            TestAttribute: {
              DataType: "String",
              StringValue: "test-value",
            },
            NumberAttribute: {
              DataType: "Number",
              StringValue: "42",
            },
          },
        })
        .promise();

      expect(data).to.be.an("object");
      expect(data.MessageId).to.be.a("string");
    });
  });

  describe("tagResource", function () {
    it("tags a topic with callback pattern", function (done) {
      if (!testTopicArn) {
        return this.skip();
      }

      sns.tagResource(
        {
          ResourceArn: testTopicArn,
          Tags: [
            { Key: "Environment", Value: "test" },
            { Key: "Purpose", Value: "sdk-integration" },
          ],
        },
        (err, data) => {
          if (err) return done(err);

          expect(data).to.be.an("object");
          done();
        }
      );
    });

    it("tags a topic with promise pattern", async function () {
      if (!testTopicArn) {
        return this.skip();
      }

      const data = await sns
        .tagResource({
          ResourceArn: testTopicArn,
          Tags: [{ Key: "TestTag", Value: "sdk-test" }],
        })
        .promise();

      expect(data).to.be.an("object");
    });
  });

  describe("deleteTopic", function () {
    it("deletes a topic with callback pattern", function (done) {
      if (!testTopicArn) {
        return this.skip();
      }

      sns.deleteTopic({ TopicArn: testTopicArn }, (err, data) => {
        if (err) return done(err);

        expect(data).to.be.an("object");
        testTopicArn = null; // Mark as deleted
        done();
      });
    });

    it("deletes a topic with promise pattern", async function () {
      // Create a new topic to delete
      const topicName = `${TEST_TOPIC_NAME}-delete-promise`;
      const createResult = await sns.createTopic({ Name: topicName }).promise();

      const data = await sns.deleteTopic({ TopicArn: createResult.TopicArn }).promise();
      expect(data).to.be.an("object");
    });
  });

  // Cleanup after all tests
  after(async function () {
    // Clean up any remaining test topics
    try {
      const listResult = await sns.listTopics({}).promise();
      const testTopics = listResult.Topics.filter((t) => t.TopicArn.includes(TEST_PREFIX));

      for (const topic of testTopics) {
        try {
          await sns.deleteTopic({ TopicArn: topic.TopicArn }).promise();
        } catch (err) {
          console.warn(`Warning: Could not delete test topic ${topic.TopicArn}:`, err.message);
        }
      }
    } catch (err) {
      console.warn("Warning: Could not clean up test topics:", err.message);
    }
  });
});
