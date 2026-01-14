const assert = require("chai").assert;
const { createCloudWatchLogsProxy } = require("../lib/cloudwatchlogs-proxy");

describe("CloudWatchLogs v3 Proxy", function () {
  describe("createCloudWatchLogsProxy", function () {
    it("returns proxy object with expected methods", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      assert.isFunction(proxy.describeLogStreams);
      assert.isFunction(proxy.createLogStream);
      assert.isFunction(proxy.putLogEvents);
      assert.isFunction(proxy.describeDestinations);
    });

    it("has _client property (v3 CloudWatchLogsClient)", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      assert.exists(proxy._client);
    });

    it("has _config property with region", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      assert.exists(proxy._config);
      assert.equal(proxy._config.region, "us-east-1");
    });
  });

  describe("method return objects", function () {
    it("describeLogStreams returns object with .promise() method", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      const result = proxy.describeLogStreams({ logGroupName: "test" });
      assert.isFunction(result.promise);
    });

    it("createLogStream returns object with .promise() method", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      const result = proxy.createLogStream({ logGroupName: "test", logStreamName: "stream" });
      assert.isFunction(result.promise);
    });

    it("putLogEvents returns object with .promise() method", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      const result = proxy.putLogEvents({ logGroupName: "test", logStreamName: "stream", logEvents: [] });
      assert.isFunction(result.promise);
    });

    it("describeDestinations returns object with .promise() method", function () {
      const proxy = createCloudWatchLogsProxy({ region: "us-east-1" });
      const result = proxy.describeDestinations({});
      assert.isFunction(result.promise);
    });
  });
});
