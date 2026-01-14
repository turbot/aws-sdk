const assert = require("chai").assert;
const { createEC2Proxy } = require("../lib/ec2-proxy");

describe("EC2 v3 Proxy", function () {
  describe("createEC2Proxy", function () {
    it("returns proxy object with expected methods", function () {
      const proxy = createEC2Proxy({ region: "us-east-1" });
      assert.isFunction(proxy.describeAccountAttributes);
    });

    it("has _client property (v3 EC2Client)", function () {
      const proxy = createEC2Proxy({ region: "us-east-1" });
      assert.exists(proxy._client);
    });

    it("has _config property with region", function () {
      const proxy = createEC2Proxy({ region: "us-east-1" });
      assert.exists(proxy._config);
      assert.equal(proxy._config.region, "us-east-1");
    });
  });

  describe("method return objects", function () {
    it("describeAccountAttributes returns object with .promise() method", function () {
      const proxy = createEC2Proxy({ region: "us-east-1" });
      const result = proxy.describeAccountAttributes({ AttributeNames: ["supported-platforms"] });
      assert.isFunction(result.promise);
    });
  });
});
