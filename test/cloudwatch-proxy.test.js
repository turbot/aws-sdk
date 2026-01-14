const assert = require("chai").assert;
const { createCloudWatchProxy } = require("../lib/cloudwatch-proxy");

describe("CloudWatch v3 Proxy", function () {
  describe("createCloudWatchProxy", function () {
    it("returns proxy object with expected methods", function () {
      const proxy = createCloudWatchProxy({ region: "us-east-1" });
      assert.isFunction(proxy.getMetricStatistics);
    });

    it("has _client property (v3 CloudWatchClient)", function () {
      const proxy = createCloudWatchProxy({ region: "us-east-1" });
      assert.exists(proxy._client);
    });

    it("has _config property with region", function () {
      const proxy = createCloudWatchProxy({ region: "us-east-1" });
      assert.exists(proxy._config);
      assert.equal(proxy._config.region, "us-east-1");
    });
  });

  describe("method return objects", function () {
    it("getMetricStatistics returns object with .promise() method", function () {
      const proxy = createCloudWatchProxy({ region: "us-east-1" });
      const result = proxy.getMetricStatistics({
        Namespace: "AWS/EC2",
        MetricName: "CPUUtilization",
        StartTime: new Date(),
        EndTime: new Date(),
        Period: 60,
        Statistics: ["Average"],
      });
      assert.isFunction(result.promise);
    });
  });
});
