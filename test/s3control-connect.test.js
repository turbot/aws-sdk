const assert = require("chai").assert;
const taws = require("..");

describe("@turbot/aws-sdk S3Control v3 integration", function () {
  describe("connect('S3Control') returns v3 proxy", function () {
    it("returns an object with v3 proxy methods", function () {
      const s3control = taws.connect("S3Control", { region: "us-east-1" });
      assert.isFunction(s3control.getPublicAccessBlock);
    });

    it("has _client property (v3 S3ControlClient)", function () {
      const s3control = taws.connect("S3Control", { region: "us-east-1" });
      assert.exists(s3control._client);
    });

    it("has _config property with region", function () {
      const s3control = taws.connect("S3Control", { region: "us-east-1" });
      assert.exists(s3control._config);
      assert.equal(s3control._config.region, "us-east-1");
    });

    it("is NOT a v2 AWS.S3Control instance", function () {
      const s3control = taws.connect("S3Control", { region: "us-east-1" });
      assert.notExists(s3control.config);
    });
  });
});
