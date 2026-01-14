# AWS SDK v3 Proxy Architecture

This document explains how the v2-to-v3 proxy layer works in `@turbot/aws-sdk`.

## The Problem We're Solving

turbot-core expects v2 API patterns:

```javascript
// Callback style
s3.getObject({ Bucket, Key }, (err, data) => {
  console.log(data.Body); // expects Buffer
});

// Promise style
const data = await s3.getObject({ Bucket, Key }).promise();

// Stream style
s3.getObject({ Bucket, Key }).createReadStream().pipe(destination);
```

AWS SDK v3 provides a different API:

```javascript
// Promise-only, returns stream for Body
const { Body } = await client.send(new GetObjectCommand({ Bucket, Key }));
// Body is a ReadableStream, not a Buffer
```

## Proxy Architecture

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│  turbot-core    │ ───▶ │  S3 Proxy    │ ───▶ │  AWS SDK v3 │
│  (v2 patterns)  │      │  (adapter)   │      │  (promises) │
└─────────────────┘      └──────────────┘      └─────────────┘
```

## Key Components

### 1. `createS3Proxy(config)` - Factory Function

Creates the proxy instance:
- Takes v3-style config (region, credentials)
- Creates an `S3Client` internally
- Returns an object with v2-compatible methods

### 2. `createRequest(promise, callback)` - Promise/Callback Bridge

This is the core adapter that makes both patterns work:

```javascript
function createRequest(promise, callback) {
  const resolvedPromise = promise.catch((err) => {
    throw normalizeError(err);
  });

  if (callback) {
    resolvedPromise
      .then((data) => callback(null, data))
      .catch((err) => callback(err));
  }

  return {
    promise: () => resolvedPromise,
  };
}
```

- Wraps any v3 promise
- If a callback is provided, calls it when the promise resolves/rejects
- Returns an object with `.promise()` method for promise-style API
- This enables both `s3.putObject(params, cb)` and `s3.putObject(params).promise()`

### 3. `normalizeError(err)` - Error Compatibility

```javascript
function normalizeError(err) {
  if (err && !err.code && err.name) {
    err.code = err.name;
  }
  return err;
}
```

- v2 errors have `err.code` (e.g., `"NoSuchKey"`)
- v3 errors have `err.name` instead
- Copies `name` to `code` so existing error handling works

### 4. Method Implementations

Each S3 method follows the same pattern:

```javascript
putObject(params, callback) {
  const promise = client.send(new PutObjectCommand(params));
  return createRequest(promise, callback);
}
```

### 5. Special: `getObject` - Buffer and Stream Support

v2 returns `Body` as a `Buffer`, v3 returns a readable stream:

```javascript
getObject(params, callback) {
  const commandPromise = client.send(new GetObjectCommand(params));

  // Transform stream to Buffer for v2 compatibility
  const resultPromise = commandPromise.then(async (result) => {
    if (result.Body && typeof result.Body.transformToByteArray === "function") {
      const bytes = await result.Body.transformToByteArray();
      result.Body = Buffer.from(bytes);
    }
    return result;
  });

  const request = createRequest(resultPromise, callback);

  // Also support createReadStream() for piping
  request.createReadStream = () => {
    // Returns a Node.js readable stream
  };

  return request;
}
```

### 6. Special: `getSignedUrl` - Different API

v2 and v3 have completely different APIs:

| v2 | v3 |
|----|-----|
| `s3.getSignedUrl('getObject', params)` | Separate `@aws-sdk/s3-request-presigner` package |

The proxy maps operation names to command classes:

```javascript
getSignedUrl(operation, params, callback) {
  const commandMap = {
    getObject: GetObjectCommand,
    putObject: PutObjectCommand,
  };

  const CommandClass = commandMap[operation];
  const command = new CommandClass(commandParams);
  const urlPromise = getSignedUrl(client, command, { expiresIn });
  // ...
}
```

### 7. Special: `upload` - Multipart Support

| v2 | v3 |
|----|-----|
| `s3.upload(params).promise()` | `Upload` class from `@aws-sdk/lib-storage` |

The proxy wraps to provide `.promise()`, `.abort()`, and `.on('httpUploadProgress')`:

```javascript
upload(params, optionsOrCallback, callback) {
  const upload = new Upload({
    client,
    params,
    queueSize: options.queueSize || 4,
    partSize: options.partSize || 5 * 1024 * 1024,
  });

  return {
    promise: () => upload.done(),
    abort: () => upload.abort(),
    on(event, handler) {
      if (event === "httpUploadProgress") {
        upload.on("httpUploadProgress", handler);
      }
      return this;
    },
  };
}
```

## Data Flow Example

When turbot-core calls `s3.getObject({ Bucket: 'x', Key: 'y' }, callback)`:

1. **Proxy receives call** → `getObject(params, callback)` in s3-proxy.js
2. **Creates v3 command** → `new GetObjectCommand(params)`
3. **Sends to AWS** → `client.send(command)` returns a promise
4. **Transforms response** → Converts stream Body to Buffer
5. **Calls callback** → `callback(null, { Body: <Buffer>, ... })`

The turbot-core code doesn't know it's talking to v3 under the hood.

## Running Tests

### Terminal

```bash
# Unit tests (no AWS calls)
cd ~/source-code/turbotio/aws-sdk && npm test

# Integration tests (requires AWS credentials)
cd ~/source-code/turbotio/aws-sdk && npm run test:integration
```

### VSCode Debugger

Open the aws-sdk workspace and use Run and Debug panel:

- **Integration Tests (All)** - runs all integration tests
- **Integration Tests (Current File)** - runs the file you have open
- **Unit Tests** - runs existing unit tests

Set breakpoints in `lib/s3-proxy.js` or `test/integration/s3.test.js` to step through the code.

## Supported S3 Methods

| Method | v3 Command | Special Handling |
|--------|-----------|------------------|
| `getObject` | `GetObjectCommand` | Body→Buffer, createReadStream() |
| `putObject` | `PutObjectCommand` | Standard |
| `deleteObject` | `DeleteObjectCommand` | Standard |
| `deleteObjects` | `DeleteObjectsCommand` | Standard |
| `listObjectsV2` | `ListObjectsV2Command` | Standard |
| `listObjectVersions` | `ListObjectVersionsCommand` | Standard |
| `headObject` | `HeadObjectCommand` | Standard |
| `copyObject` | `CopyObjectCommand` | Standard |
| `getBucketLocation` | `GetBucketLocationCommand` | Standard |
| `getSignedUrl` | `@aws-sdk/s3-request-presigner` | Different API |
| `upload` | `@aws-sdk/lib-storage` | Multipart, progress events |
