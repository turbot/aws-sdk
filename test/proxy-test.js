const taws = require("../index.js");
const run = () => {
  console.log("Proxy server setting " + process.env.HTTPS_PROXY);
  const s3 = taws.connect("S3");

  s3.listBuckets(function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.Buckets);
    }
  });
};

run();
