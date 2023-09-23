# AWS SNS Cloudflare Validator
A package for Cloudflare Workers that validates AWS SNS requests. The request body is parsed and the signature is verified. If the signature is valid, the payload is returned. If the signature is invalid, an error is thrown.

[![Coverage Status](https://coveralls.io/repos/github/devinstewart/sns-cloudflare-validator/badge.svg?branch=main)](https://coveralls.io/github/devinstewart/sns-cloudflare-validator?branch=main)
[![GitHub Workflow Status](https://github.com/devinstewart/sns-cloudflare-validator/actions/workflows/ci-plugin.yml/badge.svg?branch=main)](https://github.com/devinstewart/sns-cloudflare-validator/actions?query=workflow%3Aci+branch%3Amain)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=devinstewart_sns-cloudflare-validator&metric=sqale_rating)](https://sonarcloud.io/summary/overall?id=devinstewart_sns-cloudflare-validator)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=devinstewart_sns-cloudflare-validator&metric=security_rating)](https://sonarcloud.io/summary/overall?id=devinstewart_sns-cloudflare-validator)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=devinstewart_sns-cloudflare-validator&metric=reliability_rating)](https://sonarcloud.io/summary/overall?id=devinstewart_sns-cloudflare-validator)
## Installation
```bash
npm install sns-cloudflare-validator
```
**Please note:** This package is intended to be used with [Cloudflare Workers](https://workers.cloudflare.com/). To validate AWS SNS requests in Node.js, please use [sns-payload-validator](https://github.com/devinstewart/sns-payload-validator)

## Usage
```javascript
import { Validator } from 'sns-cloudflare-validator';

export default {
    async fetch(request) {
        try {
            const validator = new Validator();
            const payload = await validator.validate(request);
            return new Response(JSON.stringify(payload), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
        catch (error) {
            return new Response(error.message, {
                status: 400,
                headers: {
                    'Content-Type': 'text/plain'
                }
            });
        }
    }
};
```

## Settings
There are four setting that can be passed to the constructor:
- `autoSubscribe` - A message type of `SubscriptionConfirmation` automatically subscribes the endpoint to the topic after validation, default `true`.
- `autoResubscribe` - A message type of `UnsubscribeConfirmation` automatically resubscribes the endpoint to the topic after validation, default `true`.
- `useCache` - The plugin uses a cache to store the certificate for each topic. This is enabled by default, but can be disabled if you don't want to use the cache. If disabled, the certificate will be fetched from the SNS service for each request.
- `maxCerts` - The maximum number of certificates to store in the cache. This is only used if `useCache` is enabled. The default is `5000`.

All settings can be passed to the constructor as an object:
```javascript
const validator = new Validator({
    autoSubscribe: false,
    autoResubscribe: false,
    useCache: false,
    maxCerts: 100
});
```

## Additional Information
The returned payload will have the following properties:
- `Type` - The message type: `Notification`, `SubscriptionConfirmation` or `UnsubscribeConfirmation`.
- `MessageId` - A uuid provided by the SNS service for each message.
- `Token` - The token that must be passed to the `SubscribeURL` to confirm the subscription when the message type is `SubscriptionConfirmation` or `UnsubscribeConfirmation`.
- `TopicArn` - The ARN of the topic the message was sent from.
- `Subject` - The subject of the message when the message type is `Notification`. This is not present if a Subject was not provided when the message was published.
- `Message` - The message body when the message type is `Notification`.
- `Timestamp` - The time the message was sent.
- `SignatureVersion` - The version of the signature algorithm used to sign the message. Defaults to `1`, can also be `2`.
- `Signature` - The signature of the message used to verify the message integrity.
- `SigningCertURL` - The URL of the certificate used to sign the message.
- `SubscribeURL` - The URL used to subscribe the route when the message type is `SubscriptionConfirmation` or `UnsubscribeConfirmation`.
- `UnsubscribeURL` - The URL used to unsubscribe the route when the message type is `Notification`.
