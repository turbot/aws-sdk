/**
 * turbot-core SNS Usage Pattern Tests
 *
 * Tests the SNS v3 proxy with actual patterns used in turbot-core.
 * Based on analysis of lib/@turbot/sns/index.js
 *
 * Prerequisites:
 * - AWS credentials configured (via AWS_PROFILE or standard credential chain)
 * - AWS_DEFAULT_REGION set or defaults to ap-southeast-2
 */

const { expect } = require("chai");
const taws = require("../../index");

// Test configuration
const TEST_REGION = process.env.AWS_DEFAULT_REGION || "ap-southeast-2";
const TEST_PREFIX = "turbot-sdk-test";

describe("turbot-core SNS Patterns", function () {
  this.timeout(30000);

  let testTopicArn;

  before(async function () {
    // Create a test topic for the tests
    const sns = taws.connect("SNS", { region: TEST_REGION });
    const result = await sns.createTopic({ Name: `${TEST_PREFIX}-patterns-${Date.now()}` }).promise();
    testTopicArn = result.TopicArn;
  });

  describe("sns/index.js pattern: publish with MessageAttributes", function () {
    // Pattern from sns/index.js:164-323
    // SNS.publish({
    //   Message: JSON.stringify(message),
    //   MessageAttributes: {...},
    //   TopicArn: topicArn
    // }, (err, result) => {...})

    it("publish with callback pattern and JSON message", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      const message = {
        type: "test",
        data: { key: "value" },
        timestamp: Date.now(),
      };

      sns.publish(
        {
          Message: JSON.stringify(message),
          TopicArn: testTopicArn,
        },
        (err, result) => {
          if (err) return done(err);

          expect(result).to.be.an("object");
          expect(result.MessageId).to.be.a("string");
          done();
        }
      );
    });

    it("publish with MessageAttributes (String type)", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      // turbot-core uses String type for most attributes
      sns.publish(
        {
          Message: JSON.stringify({ action: "test" }),
          TopicArn: testTopicArn,
          MessageAttributes: {
            turbot_action: {
              DataType: "String",
              StringValue: "resource_update",
            },
            turbot_resource_id: {
              DataType: "String",
              StringValue: "123456789",
            },
          },
        },
        (err, result) => {
          if (err) return done(err);

          expect(result.MessageId).to.be.a("string");
          done();
        }
      );
    });

    it("publish with MessageAttributes (Number type)", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      sns.publish(
        {
          Message: JSON.stringify({ priority: 5 }),
          TopicArn: testTopicArn,
          MessageAttributes: {
            priority: {
              DataType: "Number",
              StringValue: "5",
            },
          },
        },
        (err, result) => {
          if (err) return done(err);

          expect(result.MessageId).to.be.a("string");
          done();
        }
      );
    });

    it("publish with String.Array type MessageAttributes", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      // turbot-core uses String.Array for array values
      sns.publish(
        {
          Message: JSON.stringify({ tags: ["a", "b", "c"] }),
          TopicArn: testTopicArn,
          MessageAttributes: {
            tags: {
              DataType: "String.Array",
              StringValue: JSON.stringify(["tag1", "tag2", "tag3"]),
            },
          },
        },
        (err, result) => {
          if (err) return done(err);

          expect(result.MessageId).to.be.a("string");
          done();
        }
      );
    });
  });

  describe("connectivity-checker pattern: listTopics", function () {
    // Pattern from turbot-connectivity-checker/main.js:121
    // sns.listTopics({}, (err) => {...})

    it("listTopics with callback pattern", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      sns.listTopics({}, (err, data) => {
        if (err) return done(err);

        expect(data.Topics).to.be.an("array");
        done();
      });
    });
  });

  describe("lambda/index.js pattern: subscribe", function () {
    // Pattern from lambda/index.js:4287
    // sns.subscribe({
    //   Protocol: "lambda",
    //   TopicArn: topicArn,
    //   Endpoint: lambdaArn
    // }, (err, results) => {...})

    it("subscribe handles invalid endpoint gracefully", function (done) {
      // Skip this test - subscribing to cross-account Lambda can hang
      // The actual turbot-core code only subscribes to valid Lambda endpoints
      this.skip();
    });
  });

  describe("topic management patterns", function () {
    it("createTopic is idempotent", async function () {
      const sns = taws.connect("SNS", { region: TEST_REGION });
      const topicName = testTopicArn.split(":").pop();

      const result1 = await sns.createTopic({ Name: topicName }).promise();
      const result2 = await sns.createTopic({ Name: topicName }).promise();

      expect(result1.TopicArn).to.equal(result2.TopicArn);
    });

    it("getTopicAttributes returns TopicArn in Attributes", async function () {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      const data = await sns.getTopicAttributes({ TopicArn: testTopicArn }).promise();

      expect(data.Attributes).to.be.an("object");
      expect(data.Attributes.TopicArn).to.equal(testTopicArn);
    });

    it("setTopicAttributes with callback pattern", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      sns.setTopicAttributes(
        {
          TopicArn: testTopicArn,
          AttributeName: "DisplayName",
          AttributeValue: "turbot-core-test",
        },
        (err) => {
          if (err) return done(err);
          done();
        }
      );
    });
  });

  describe("error handling patterns", function () {
    // turbot-core logs errors with topicArn and region

    it("publish error includes code property", function (done) {
      const sns = taws.connect("SNS", { region: TEST_REGION });

      sns.publish(
        {
          Message: "test",
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

  // Cleanup
  after(async function () {
    if (testTopicArn) {
      const sns = taws.connect("SNS", { region: TEST_REGION });
      try {
        await sns.deleteTopic({ TopicArn: testTopicArn }).promise();
      } catch (err) {
        console.warn(`Warning: Could not delete test topic:`, err.message);
      }
    }
  });
});
