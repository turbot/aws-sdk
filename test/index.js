const _ = require("lodash");
const assert = require("chai").assert;
const testConsole = require("test-console");
const taws = require("..");

describe("@turbot/aws-sdk", function () {
  describe("Default base case", function () {
    var conn;
    before(function () {
      conn = taws.connect("SSM");
    });
    it("uses signature v4", function () {
      assert.equal(conn.config.signatureVersion, "v4");
    });
    it("has no proxy", function () {
      assert.exists(conn.config.httpOptions.timeout);
      assert.notExists(conn.config.httpOptions.agent);
    });
  });

  describe("signatureVersion override", function () {
    var conn;
    before(function () {
      conn = taws.connect("SSM", {
        signatureVersion: "v3",
      });
    });
    it("uses signature as specified", function () {
      assert.equal(conn.config.signatureVersion, "v3");
    });
  });

  describe("Region configuration", function () {
    var tmpEnv;

    before(function () {
      tmpEnv = _.pick(process.env, "AWS_REGION", "TURBOT_CONFIG_ENV");
    });

    after(function () {
      for (let k in tmpEnv) {
        if (tmpEnv[k]) {
          process.env[k] = tmpEnv[k];
        } else {
          delete process.env[k];
        }
      }
    });

    describe("Defaults to AWS_REGION", function () {
      var conn;
      const region = "ap-northeast-1";
      before(function () {
        process.env.AWS_REGION = region;
        conn = taws.connect("SSM");
      });
      it("as expected", function () {
        assert.equal(conn.config.region, region);
      });
    });

    describe("Prefers TURBOT_CONFIG.env.region over AWS_REGION", function () {
      var conn;
      const region = "ap-northeast-2";
      before(function () {
        process.env.TURBOT_CONFIG_ENV = JSON.stringify({ env: { region: region } });
        conn = taws.connect("SSM");
      });
      it("as expected", function () {
        assert.equal(conn.config.region, region);
      });
    });

    describe("Prefers connection setting over env vars", function () {
      var conn;
      const region = "ap-northeast-3";
      before(function () {
        conn = taws.connect("SSM", {
          region: region,
        });
      });
      it("as expected", function () {
        assert.equal(conn.config.region, region);
      });
    });
  });

  describe("Proxy", function () {
    var tmpEnv;

    before(function () {
      tmpEnv = _.pick(process.env, "AWS_REGION", "TURBOT_CONFIG_ENV");
    });

    after(function () {
      for (let k in tmpEnv) {
        if (tmpEnv[k]) {
          process.env[k] = tmpEnv[k];
        } else {
          delete process.env[k];
        }
      }
    });

    describe("https_proxy URL only", function () {
      var conn;
      let proxy = {
        aws: { proxy: { https_proxy: "https://my-proxy.example.com" } },
      };
      before(function () {
        process.env.TURBOT_CONFIG_ENV = JSON.stringify(proxy);
        conn = taws.connect("SSM");
      });
      it("has proxy agent with correct host", function () {
        assert.exists(conn.config.httpOptions.agent);
      });
      it("has correct proxy uri", function () {
        assert.equal(
          conn.config.httpOptions.agent.proxy.protocol + "//" + conn.config.httpOptions.agent.proxy.host,
          proxy.aws.proxy.https_proxy
        );
      });
    });

    describe("Log and ignore (don't error) if https_proxy is hostname with no protocol", function () {
      var conn, logLines, logLine;
      let proxy = {
        aws: { proxy: { https_proxy: "my-proxy.example.com" } },
      };
      before(function () {
        process.env.TURBOT_CONFIG_ENV = JSON.stringify(proxy);
        logLines = testConsole.stdout.inspectSync(function () {
          conn = taws.connect("SSM");
        });
        logLine = JSON.parse(logLines[0]);
      });
      it("logged invalid URL error", function () {
        assert.equal(logLine.level, "error");
        assert.include(logLine.message, "Invalid URL");
      });
      it("has no proxy", function () {
        assert.exists(conn.config.httpOptions.timeout);
        assert.notExists(conn.config.httpOptions.agent);
      });
    });
  });
});
