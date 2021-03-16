
// This needs to be done before we load s3 object
process.env["HTTPS_PROXY"] = "http://localhost:8866";
process.env["HTTP_PROXY"] = "http://localhost:8866";
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0


const taws = require("../index");

const s3 = taws.connect("S3");

// test using Fiddler

s3.listBuckets((err, results) => {
  if (err) {
    console.error(err);
  }
  console.log(results);
})