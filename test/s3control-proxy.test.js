const assert = require("chai").assert;
const { createS3ControlProxy } = require("../lib/s3control-proxy");

describe("S3Control v3 Proxy", function () {
  describe("createS3ControlProxy", function () {
    it("returns proxy object with expected methods", function () {
      const proxy = createS3ControlProxy({ region: "us-east-1" });
      assert.isFunction(proxy.getPublicAccessBlock);
    });

    it("has _client property (v3 S3ControlClient)", function () {
      const proxy = createS3ControlProxy({ region: "us-east-1" });
      assert.exists(proxy._client);
    });

    it("has _config property with region", function () {
      const proxy = createS3ControlProxy({ region: "us-east-1" });
      assert.exists(proxy._config);
      assert.equal(proxy._config.region, "us-east-1");
    });
  });

  describe("method return objects", function () {
    it("getPublicAccessBlock returns object with .promise() method", function () {
      const proxy = createS3ControlProxy({ region: "us-east-1" });
      const result = proxy.getPublicAccessBlock({ AccountId: "123456789012" });
      assert.isFunction(result.promise);
    });
  });
});
