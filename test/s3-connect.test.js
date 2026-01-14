const assert = require("chai").assert;
const taws = require("..");

describe("@turbot/aws-sdk S3 v3 integration", function () {
  describe("connect('S3') returns v3 proxy", function () {
    let s3;

    before(function () {
      s3 = taws.connect("S3", { region: "us-east-1" });
    });

    it("returns an object with v3 proxy methods", function () {
      assert.isFunction(s3.getObject);
      assert.isFunction(s3.putObject);
      assert.isFunction(s3.deleteObject);
      assert.isFunction(s3.listObjectsV2);
      assert.isFunction(s3.upload);
      assert.isFunction(s3.getSignedUrl);
    });

    it("has _client property (v3 S3Client)", function () {
      assert.exists(s3._client);
    });

    it("has _config property with region", function () {
      assert.exists(s3._config);
      assert.equal(s3._config.region, "us-east-1");
    });

    it("is NOT a v2 AWS.S3 instance", function () {
      // v2 clients have serviceIdentifier property
      assert.notExists(s3.serviceIdentifier);
      // v2 clients have config.httpOptions
      assert.notExists(s3.config);
    });
  });

  describe("buildS3V3Config", function () {
    describe("region", function () {
      it("passes through region", function () {
        const v3Config = taws.buildS3V3Config({ region: "ap-southeast-2" });
        assert.equal(v3Config.region, "ap-southeast-2");
      });
    });

    describe("credentials", function () {
      it("passes through credentials when all three are provided", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: "TOKEN",
        });
        assert.deepEqual(v3Config.credentials, {
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: "TOKEN",
        });
      });

      it("passes through credentials without sessionToken", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
        });
        assert.deepEqual(v3Config.credentials, {
          accessKeyId: "AKID",
          secretAccessKey: "SECRET",
          sessionToken: undefined,
        });
      });

      it("does not set credentials if accessKeyId is missing", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          secretAccessKey: "SECRET",
        });
        assert.notExists(v3Config.credentials);
      });

      it("does not set credentials if secretAccessKey is missing", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          accessKeyId: "AKID",
        });
        assert.notExists(v3Config.credentials);
      });
    });

    describe("custom endpoint", function () {
      it("passes through endpoint", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          endpoint: "https://s3.custom.example.com",
        });
        assert.equal(v3Config.endpoint, "https://s3.custom.example.com");
      });

      it("passes through forcePathStyle when s3ForcePathStyle is true", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          endpoint: "https://s3.custom.example.com",
          s3ForcePathStyle: true,
        });
        assert.equal(v3Config.forcePathStyle, true);
      });

      it("does not set forcePathStyle without endpoint", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          s3ForcePathStyle: true,
        });
        assert.notExists(v3Config.forcePathStyle);
      });
    });

    describe("proxy support", function () {
      it("creates requestHandler when httpOptions.agent is present", function () {
        const mockAgent = { host: "proxy.example.com" };
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          httpOptions: { agent: mockAgent },
        });
        assert.exists(v3Config.requestHandler);
      });

      it("does not create requestHandler without httpOptions.agent", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
          httpOptions: {},
        });
        assert.notExists(v3Config.requestHandler);
      });

      it("does not create requestHandler without httpOptions", function () {
        const v3Config = taws.buildS3V3Config({
          region: "us-east-1",
        });
        assert.notExists(v3Config.requestHandler);
      });
    });
  });

  describe("S3 proxy with proxy agent via connect()", function () {
    let tmpEnv;

    before(function () {
      tmpEnv = process.env.TURBOT_CONFIG_ENV;
    });

    after(function () {
      if (tmpEnv) {
        process.env.TURBOT_CONFIG_ENV = tmpEnv;
      } else {
        delete process.env.TURBOT_CONFIG_ENV;
      }
    });

    it("passes proxy through when configured via TURBOT_CONFIG_ENV", function () {
      const proxyConfig = {
        aws: { proxy: { https_proxy: "https://my-proxy.example.com" } },
      };
      process.env.TURBOT_CONFIG_ENV = JSON.stringify(proxyConfig);

      const s3 = taws.connect("S3", { region: "us-east-1" });

      // The v3 config should have a requestHandler configured
      assert.exists(s3._config.requestHandler);
    });
  });
});
