const assert = require("chai").assert;
const taws = require("..");

describe("@turbot/aws-sdk EC2 v3 integration", function () {
  describe("connect('EC2') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const ec2 = taws.connect("EC2", { region: "us-east-1" });
      assert.isFunction(ec2.describeAccountAttributes);
    });

    it("has _client property (v3 EC2Client)", function () {
      const ec2 = taws.connect("EC2", { region: "us-east-1" });
      assert.exists(ec2._client);
    });

    it("has _config property with region", function () {
      const ec2 = taws.connect("EC2", { region: "us-east-1" });
      assert.exists(ec2._config);
      assert.equal(ec2._config.region, "us-east-1");
    });

    it("is NOT a v2 AWS.EC2 instance", function () {
      const ec2 = taws.connect("EC2", { region: "us-east-1" });
      assert.notExists(ec2.config);
    });
  });
});
