const assert = require("chai").assert;
const taws = require("..");

describe("@turbot/aws-sdk AutoScaling v3 integration", function () {
  describe("connect('AutoScaling') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const autoscaling = taws.connect("AutoScaling", { region: "us-east-1" });
      assert.isFunction(autoscaling.completeLifecycleAction);
    });

    it("has _client property (v3 AutoScalingClient)", function () {
      const autoscaling = taws.connect("AutoScaling", { region: "us-east-1" });
      assert.exists(autoscaling._client);
    });

    it("has _config property with region", function () {
      const autoscaling = taws.connect("AutoScaling", { region: "us-east-1" });
      assert.exists(autoscaling._config);
      assert.equal(autoscaling._config.region, "us-east-1");
    });

    it("is NOT a v2 AWS.AutoScaling instance", function () {
      const autoscaling = taws.connect("AutoScaling", { region: "us-east-1" });
      assert.notExists(autoscaling.config);
    });
  });
});
