# Turbot AWS SDK

# Release History

## 5.15.0 [2024-08-10]

- Updated: micromatch to 4.0.8 (from 4.0.5). aws-sdk to 2.1685.0.

## 5.14.0 [2024-05-22]

- Updated: aws-sdk to 2.1146.

## 5.13.0 [2023-12-06]

- Updated: aws-sdk to 2.922.

## 5.12.0 [2023-11-21]

- Updated: @turbot/errors to 5.3.0. @turbot/log to 5.4.0. aws-sdk to 2.1500. micromatch to 4.0.5. chai to 4.3.10.

## 5.11.0 [2022-06-22]

- Updated: @turbot/utils to 5.5.0. json-schema to 0.4.0 (from 0.2.3).

## 5.10.0 [2022-04-07]

- Updated: replaced proxy-agent with https-proxy-agent to reduce external dependencies. In particular vm2 dependency brought in by `pac-proxy-agent` which we don't need (we don't support PAC proxy files).

## 5.9.0 [2022-04-04]

- Updated: proxy-agent to 5.0.0
- Fixed: Simplify user agent field to avoid potential ever increasing size #39

## 5.8.0 [2021-06-07]

- Updated: @turbot/errors to 5.2.0. @turbot/log to 5.3.0. micromatch to 4.0.4. proxy-agent to 4.0.1. Various dev dependencies.

## 5.7.0 [2021-05-13]

- Updated: default custom backoff will retry with the following backoff: 1) 900 and 1100ms, 2) 1800 and 2200ms, 3) 3600 and 4400ms. This default value can be overriden.

## 5.6.0 [2021-03-17]

- Added: Turbot info in the user agent field.

## 5.5.1 [2020-11-12]

- Updated: aws-sdk to ^2.789, lodash to ^4.17.20.

## 5.5.0 [2020-07-30]

- Updated: @turbot/errors to 5.1.0. @turbot/log to 5.2.0. aws-sdk to ^2.723.0. lodash to ^4.17.19. Various dev dependencies.

## 5.4.0 [2020-06-22]

- Updated: aws-sdk to 2.701.0.
- Updated: Removed aws4 from dependencies. Removed mocha-sinon from dev dependencies.

## 5.3.0 [2020-04-30]

- Updated: @turbot/log to 5.1.0, aws-sdk to 2.666.0, proxy-agent to 3.1.0, request to 2.88.2, aws4 to 1.9.1 and various dev dependencies.

## 5.2.0 [2020-03-31]

- Updated: aws-sdk to version 2.649.0.
- Updated: dev dependencies.

## 5.1.0 [2020-02-21]

- Updated: @turbot/utils to 2.623.0.

## 5.0.8 [2020-02-05]

- Updated: @turbot/utils to v5.0.5.
- Updated: lodash to v4.17.15

## 5.0.7 [2019-12-19]

- Fixed: removed a test file that contains AWS Access Key.

## 5.0.6 [2019-12-19]

- Updated: License to Apache 2.0.
- Updated: @turbot/errors to 5.0.4. Update @turbot/log to 5.0.2.
- Updated: dev dependencies.

## 5.0.5 [2019-12-06]

- Updated: aws-sdk to version 2.585.0.

## 5.0.4 [2019-11-18]

- Updated: dependencies.

## 5.0.3 [2019-10-09]

- Added: custom backoff function for resource discovery.

## 5.0.2 [2019-08-13]

- Updated: aws-sdk to 2.503.0.

## 5.0.1 [2019-07-17]

- Added: ability to instantiate AWS classes with ".", i.e. "RDS.Signer".
- Updated: lodash to 4.17.14.

## 5.0.0 [2019-07-10]

- Initial version.
