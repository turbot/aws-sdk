const aws = require("aws-sdk");
aws.config.credentials = null;

const connectToAws = (accessKey, accessKeySecret, callback) => {
  const params = {};

  const creds = {
    accessKeyId: accessKey,
    secretAccessKey: accessKeySecret
  };

  const sqs = new aws["SQS"]({ credentials: creds });
  aws.config.credentials = null;

  sqs.listQueues(params, (err, data) => {
    callback(err, data);
  });
};

const connectToAwsClean = callback => {
  const sqs = new aws["SQS"]();

  // console.log("aws.config.credentials", aws.config.credentials);
  // console.log("sqs", sqs);

  const params = {};
  sqs.listQueues(params, (err, data) => {
    // console.log("sqs AFTER list queue", sqs);
    // console.log("aws.config.credentials after listQueues", aws.config.credentials);

    callback(err, data);
  });
};

/////
process.env.AWS_REGION = "ap-southeast-2";
process.env.AWS_ACCESS_KEY_ID = "AKIAI5HOILYZHR7WXE2Q";
process.env.AWS_SECRET_ACCESS_KEY = "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";

connectToAwsClean((err, results) => {
  console.log("err", err);
  console.log("results", results);

  process.env.AWS_ACCESS_KEY_ID = "AKIAIWGXZ4CADA2I4ZFQ";
  process.env.AWS_SECRET_ACCESS_KEY = "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";

  connectToAwsClean((_err, _results) => {
    console.log("err", _err);
    console.log("results", _results);
  });
});
