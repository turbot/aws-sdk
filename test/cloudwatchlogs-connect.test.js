const assert = require("chai").assert;
const taws = require("..");

describe("@turbot/aws-sdk CloudWatchLogs v3 integration", function () {
  describe("connect('CloudWatchLogs') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const logs = taws.connect("CloudWatchLogs", { region: "us-east-1" });
      assert.isFunction(logs.describeLogStreams);
      assert.isFunction(logs.createLogStream);
      assert.isFunction(logs.putLogEvents);
      assert.isFunction(logs.describeDestinations);
    });

    it("has _client property (v3 CloudWatchLogsClient)", function () {
      const logs = taws.connect("CloudWatchLogs", { region: "us-east-1" });
      assert.exists(logs._client);
    });

    it("has _config property with region", function () {
      const logs = taws.connect("CloudWatchLogs", { region: "us-east-1" });
      assert.exists(logs._config);
      assert.equal(logs._config.region, "us-east-1");
    });

    it("is NOT a v2 AWS.CloudWatchLogs instance", function () {
      const logs = taws.connect("CloudWatchLogs", { region: "us-east-1" });
      // v2 instances have config.signatureVersion, v3 proxies don't
      assert.notExists(logs.config);
    });
  });
});
