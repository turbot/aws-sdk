const assert = require("chai").assert;
const { createAutoScalingProxy } = require("../lib/autoscaling-proxy");

describe("AutoScaling v3 Proxy", function () {
  describe("createAutoScalingProxy", function () {
    it("returns proxy object with expected methods", function () {
      const proxy = createAutoScalingProxy({ region: "us-east-1" });
      assert.isFunction(proxy.completeLifecycleAction);
    });

    it("has _client property (v3 AutoScalingClient)", function () {
      const proxy = createAutoScalingProxy({ region: "us-east-1" });
      assert.exists(proxy._client);
    });

    it("has _config property with region", function () {
      const proxy = createAutoScalingProxy({ region: "us-east-1" });
      assert.exists(proxy._config);
      assert.equal(proxy._config.region, "us-east-1");
    });
  });

  describe("method return objects", function () {
    it("completeLifecycleAction returns object with .promise() method", function () {
      const proxy = createAutoScalingProxy({ region: "us-east-1" });
      const result = proxy.completeLifecycleAction({
        AutoScalingGroupName: "test",
        LifecycleHookName: "hook",
        LifecycleActionResult: "CONTINUE",
      });
      assert.isFunction(result.promise);
    });
  });
});
