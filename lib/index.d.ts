declare class Validator {
    /**
    * Instantiates a SnsPayloadValidator object.
    */
    constructor(options?: SnsPayloadValidator.Configuration)

    /**
    * Validates an the request to be a valid SNS request.
    *
    * @param request - The request to validate.
    * @returns {Promise<SnsPayloadValidator.SnsPayload>} The body of the request if it is valid SNS request as a JavaScript object.
    */
    validate(request: Request): Promise<SnsPayloadValidator.SnsPayload>;
}

declare namespace SnsPayloadValidator {
    interface Configuration {
        /**
        * If true, A message type of `SubscriptionConfirmation` automatically subscribes the endpoint to the topic after validation Default: true.
        */
        autoSubscribe?: boolean;
        /**
        * If true, A message type of `UnsubscribeConfirmation` automatically resubscribes the endpoint to the topic after validation Default: true.
        */
        autoResubscribe?: boolean;
        /**
        * If true, the validator will cache the certificates it downloads from Amazon SNS using LRU Cache. Default: true.
        */
        useCache?: boolean;
        /**
        * The maximum number of certificates to cache. Must be positive integer. Default: 1000.
        * If the number of certificates exceeds this value, the least recently used certificate will be removed from the cache.
        */
        maxCerts?: number;

        /**
        * Optional https.Agent for downloading SigningCertURL
        */

    }

    /**
    * The POST message of Amazon SNS values.
    */
    interface SnsPayload {
        /**
        * The type of message.
        */
        Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
        /**
        * A Universally Unique Identifier, unique for each message published.
        */
        MessageId: string;
        /**
        * A value to use with the ConfirmSubscription action to confirm or re-confirm the subscription.
        */
        Token?: string;
        /**
        * The Amazon Resource Name (ARN) for the topic that this message was published to.
        */
        TopicArn: string;
        /**
        * The Subject parameter specified when the notification was published to the topic.
        */
        Subject?: string;
        /**
        * The Message value specified when the notification was published to the topic.
        */
        Message: string;
        /**
        * The time (GMT) when the notification was published.
        */
        Timestamp: string;
        /**
        * Version of the Amazon SNS signature used.
        */
        SignatureVersion: '1' | '2';
        /**
        * Base64-encoded SHA1withRSA or SHA256withRSA signature of the Message, MessageId, Subject (if present), Type, Timestamp, and TopicArn values.
        */
        Signature: string;
        /**
        * The URL to the certificate that was used to sign the message.
        */
        SigningCertURL: string;
        /**
        * The URL to visit in order to confirm or re-confirm the subscription.
        */
        SubscribeURL?: string;
        /**
        * A URL to unsubscribe the endpoint from this topic. If visted, Amazon SNS unsubscribes the endpoint and stops sending notifications to this endpoint.
        */
        UnsubscribeURL?: string;
    }
}

export { Validator }