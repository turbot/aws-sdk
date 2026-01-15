/**
 * ECS Container Credentials with Exponential Backoff
 *
 * WHY THIS EXISTS:
 * AWS SDK v3's fromContainerMetadata only supports `timeout` and `maxRetries` options.
 * Unlike v2's RemoteCredentials which had `retryDelayOptions.customBackoff`, v3 retries
 * happen instantly with no delay between attempts. This is problematic when the ECS
 * metadata service returns 429 (rate limiting) - all retries fail in under 1ms.
 *
 * This was reported as Issue #2706 (https://github.com/aws/aws-sdk-js-v3/issues/2706)
 * but was closed as stale in September 2022 without implementing backoff support.
 * The SDK team's position was that users can write custom credential providers.
 *
 * WHAT THIS DOES:
 * Wraps fromContainerMetadata with our own retry loop that includes exponential
 * backoff with jitter, matching the original logic from server-api/index.js that
 * used v2's AWS.RemoteCredentials.
 *
 * BACKOFF FORMULA:
 * delay = (2^retryCount * 100ms) * 0.9 + random jitter up to 20%
 * Retry 0: ~90-110ms, Retry 1: ~180-220ms, Retry 2: ~360-440ms, etc.
 */

const { fromContainerMetadata } = require("@aws-sdk/credential-providers");

/**
 * Custom exponential backoff delay.
 * Matches the original server-api logic: base * 0.9 + variation * 0.2
 */
function calculateBackoff(retryCount) {
  const total = Math.pow(2, retryCount) * 100;
  const base = total * 0.9;
  const variation = total * 0.2 * Math.random();
  const result = base + variation;
  console.log("ECS credentials custom backoff", { result, retryCount, base, variation });
  return result;
}

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a credential provider that wraps fromContainerMetadata with custom
 * exponential backoff retry logic.
 *
 * SDK v3's fromContainerMetadata only supports maxRetries with no delay between
 * retries. This wrapper adds the exponential backoff that v2's RemoteCredentials
 * supported via retryDelayOptions.customBackoff.
 *
 * @param {Object} options
 * @param {number} options.timeout - Connection timeout in ms (default: 5000)
 * @param {number} options.maxRetries - Max retry attempts (default: 10)
 * @param {Function} options._providerFactory - For testing: override the base provider
 * @returns {Function} Credential provider function
 */
function fromContainerMetadataWithBackoff(options = {}) {
  const { timeout = 5000, maxRetries = 10, _providerFactory } = options;

  // Allow injection for testing, default to real provider
  const baseProvider = _providerFactory
    ? _providerFactory({ timeout, maxRetries: 0 })
    : fromContainerMetadata({ timeout, maxRetries: 0 });

  return async () => {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await baseProvider();
      } catch (err) {
        lastError = err;

        if (attempt < maxRetries) {
          const delayMs = calculateBackoff(attempt);
          await sleep(delayMs);
        }
      }
    }

    throw lastError;
  };
}

/**
 * Check if running in ECS environment.
 * ECS sets these env vars when task IAM role credentials are available.
 */
function isEcsEnvironment() {
  return !!(process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI || process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI);
}

module.exports = {
  fromContainerMetadataWithBackoff,
  isEcsEnvironment,
  calculateBackoff, // Exported for testing
};
