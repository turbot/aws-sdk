/**
 * S3 v2-to-v3 Proxy
 *
 * Provides a v2-compatible callback-based API backed by AWS SDK v3.
 * This allows existing code to continue using the familiar v2 patterns
 * while benefiting from v3's modular architecture and improved performance.
 *
 * Supported patterns:
 * 1. Callback: s3.putObject(params, (err, data) => {})
 * 2. Promise:  s3.putObject(params).promise()
 * 3. Stream:   s3.getObject(params).createReadStream() (getObject only)
 *
 * Supported methods:
 * - getObject, putObject, deleteObject, deleteObjects
 * - listObjectsV2, listObjectVersions, headObject, copyObject
 * - getBucketLocation, getSignedUrl, upload
 */

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetBucketLocationCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Upload } = require("@aws-sdk/lib-storage");
const { Readable } = require("stream");

/**
 * Normalize errors from v3 to v2 format.
 * v2 uses err.code, v3 uses err.name
 */
function normalizeError(err) {
  if (err && !err.code && err.name) {
    err.code = err.name;
  }
  return err;
}

/**
 * Create a v2-compatible request object that supports both callback and promise patterns.
 *
 * @param {Promise} promise - The v3 promise to wrap
 * @param {Function} callback - Optional callback for callback-style usage
 * @returns {Object} - Object with .promise() method
 */
function createRequest(promise, callback) {
  // Wrap the promise to normalize errors (add .code for v2 compatibility)
  // This promise can still reject - we just transform the error before it does
  const normalizedPromise = promise.catch((err) => {
    throw normalizeError(err);
  });

  if (callback) {
    normalizedPromise.then((data) => callback(null, data)).catch((err) => callback(err));
  }

  return {
    promise: () => normalizedPromise,
  };
}

/**
 * Create an S3 proxy instance that wraps v3 client with v2-compatible API.
 *
 * @param {Object} config - S3 client configuration
 * @returns {Object} - Proxy object with v2-compatible methods
 */
function createS3Proxy(config) {
  const client = new S3Client(config);

  const proxy = {
    // Expose underlying client for advanced use cases
    _client: client,
    _config: config,

    /**
     * getObject - Retrieve an object from S3
     *
     * v2: s3.getObject(params, callback) or s3.getObject(params).promise()
     * Also supports: s3.getObject(params).createReadStream()
     */
    getObject(params, callback) {
      const commandPromise = client.send(new GetObjectCommand(params));

      // Transform response to convert Body stream to Buffer
      const resultPromise = commandPromise.then(async (result) => {
        if (result.Body && typeof result.Body.transformToByteArray === "function") {
          const bytes = await result.Body.transformToByteArray();
          result.Body = Buffer.from(bytes);
        }
        return result;
      });

      const request = createRequest(resultPromise, callback);

      // Add createReadStream() support for v2 compatibility
      request.createReadStream = () => {
        const passThrough = new Readable({ read() {} });

        commandPromise
          .then(async (result) => {
            if (result.Body) {
              // v3 Body is a readable stream
              for await (const chunk of result.Body) {
                passThrough.push(chunk);
              }
              passThrough.push(null);
            }
          })
          .catch((err) => {
            passThrough.destroy(normalizeError(err));
          });

        return passThrough;
      };

      return request;
    },

    /**
     * putObject - Upload an object to S3
     */
    putObject(params, callback) {
      const promise = client.send(new PutObjectCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteObject - Delete a single object from S3
     */
    deleteObject(params, callback) {
      const promise = client.send(new DeleteObjectCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * deleteObjects - Delete multiple objects from S3
     */
    deleteObjects(params, callback) {
      const promise = client.send(new DeleteObjectsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * listObjectsV2 - List objects in a bucket
     */
    listObjectsV2(params, callback) {
      const promise = client.send(new ListObjectsV2Command(params));
      return createRequest(promise, callback);
    },

    /**
     * listObjectVersions - List object versions (for versioned buckets)
     */
    listObjectVersions(params, callback) {
      const promise = client.send(new ListObjectVersionsCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * headObject - Get object metadata without downloading the body
     */
    headObject(params, callback) {
      const promise = client.send(new HeadObjectCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * copyObject - Copy an object within S3
     */
    copyObject(params, callback) {
      const promise = client.send(new CopyObjectCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * getBucketLocation - Get the region where a bucket resides
     */
    getBucketLocation(params, callback) {
      const promise = client.send(new GetBucketLocationCommand(params));
      return createRequest(promise, callback);
    },

    /**
     * getSignedUrl - Generate a pre-signed URL for temporary access
     *
     * v2: s3.getSignedUrl(operation, params, callback) or s3.getSignedUrl(operation, params)
     * v3: Uses @aws-sdk/s3-request-presigner
     */
    getSignedUrl(operation, params, callback) {
      const commandMap = {
        getObject: GetObjectCommand,
        putObject: PutObjectCommand,
      };

      const CommandClass = commandMap[operation];
      if (!CommandClass) {
        const err = new Error(`Unsupported operation for getSignedUrl: ${operation}`);
        if (callback) {
          return callback(err);
        }
        throw err;
      }

      // Extract expiry from params (v2 uses Expires in seconds)
      const expiresIn = params.Expires || 900; // Default 15 minutes
      const commandParams = { ...params };
      delete commandParams.Expires;

      const command = new CommandClass(commandParams);
      const urlPromise = getSignedUrl(client, command, { expiresIn });

      if (callback) {
        urlPromise.then((url) => callback(null, url)).catch((err) => callback(normalizeError(err)));
        return;
      }

      // v2 sync mode returns a string, but v3 is async.
      // Return promise - callers using sync mode should use callback or await
      return urlPromise;
    },

    /**
     * upload - Stream-based upload with multipart support
     *
     * v2: s3.upload(params, options, callback) or s3.upload(params).promise()
     */
    upload(params, optionsOrCallback, callback) {
      let options = {};
      let cb = callback;

      if (typeof optionsOrCallback === "function") {
        cb = optionsOrCallback;
      } else if (optionsOrCallback) {
        options = optionsOrCallback;
      }

      const upload = new Upload({
        client,
        params,
        queueSize: options.queueSize || 4,
        partSize: options.partSize || 5 * 1024 * 1024, // 5MB default
        leavePartsOnError: false,
      });

      // Return object with promise() method for v2 compatibility
      const uploadObj = {
        promise: () => upload.done(),
        abort: () => upload.abort(),
        on(event, handler) {
          if (event === "httpUploadProgress") {
            upload.on("httpUploadProgress", handler);
          }
          return uploadObj;
        },
      };

      if (cb) {
        upload
          .done()
          .then((result) => cb(null, result))
          .catch((err) => cb(normalizeError(err)));
      }

      return uploadObj;
    },
  };

  return proxy;
}

module.exports = {
  createS3Proxy,
};
