const assert = require("chai").assert;
const taws = require("..");

describe("@turbot/aws-sdk CloudWatch v3 integration", function () {
  describe("connect('CloudWatch') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const cloudwatch = taws.connect("CloudWatch", { region: "us-east-1" });
      assert.isFunction(cloudwatch.getMetricStatistics);
    });

    it("has _client property (v3 CloudWatchClient)", function () {
      const cloudwatch = taws.connect("CloudWatch", { region: "us-east-1" });
      assert.exists(cloudwatch._client);
    });

    it("has _config property with region", function () {
      const cloudwatch = taws.connect("CloudWatch", { region: "us-east-1" });
      assert.exists(cloudwatch._config);
      assert.equal(cloudwatch._config.region, "us-east-1");
    });

    it("is NOT a v2 AWS.CloudWatch instance", function () {
      const cloudwatch = taws.connect("CloudWatch", { region: "us-east-1" });
      assert.notExists(cloudwatch.config);
    });
  });
});
