import * as Crypto from 'crypto';
import { privateKeyPem } from './pems';
import { signingCertUrl } from './signingCertUrl';
import { signingCertHost } from './signingCertHost';
import { getKeys } from '../../lib/keys';

const internals = {};

// Function to Add Signature to valid payloads with private key used in certificate
internals.addSignature = (payload, signatureVersion = '1') => {

    const sign = signatureVersion === '1' ? Crypto.createSign('sha1WithRSAEncryption') : Crypto.createSign('sha256WithRSAEncryption');
    const keys = getKeys(payload.Type);
    for (const key of keys) {
        if (key in payload) {
            sign.write(`${key}\n${payload[key]}\n`);
        }
    }

    sign.end();

    payload.Signature = sign.sign(privateKeyPem, 'base64');
    return payload;
};

internals.MessageId = 'edeb3e00-ad32-5092-abe9-67ad99b82fdc';
internals.TopicArn = 'arn:aws:sns:us-east-1:012345678910:test';
internals.SubscribeURL = 'https://sns.us-east-1.amazonaws.com/?Action=ConfirmSubscription?MoreStuff=MoreStuff';

internals.validNotificationSv1 = {
    Type: 'Notification',
    MessageId: internals.MessageId,
    TopicArn: internals.TopicArn,
    Message: 'Hello SNS SignatureVersion 1!',
    Timestamp: (new Date()).toISOString(),
    SignatureVersion: '1',
    SigningCertURL: signingCertUrl
};

internals.validNotificationSv2 = {
    Type: 'Notification',
    MessageId: internals.MessageId,
    TopicArn: internals.TopicArn,
    Message: 'Hello SNS SignatureVersion 2!',
    Timestamp: (new Date()).toISOString(),
    SignatureVersion: '2',
    SigningCertURL: signingCertUrl
};

internals.validNotificationWithSubject = {
    Type: 'Notification',
    MessageId: internals.MessageId,
    TopicArn: internals.TopicArn,
    Subject: 'Regarding SNS',
    Message: 'Hello SNS!',
    Timestamp: (new Date()).toISOString(),
    SignatureVersion: '1',
    SigningCertURL: signingCertUrl
};

internals.validSubscriptionConfirmation = {
    Type: 'SubscriptionConfirmation',
    MessageId: internals.MessageId,
    Token: '0123456789abcdef',
    TopicArn: internals.TopicArn,
    Message: 'You have chosen to subscribe to the topic...',
    SubscribeURL: internals.SubscribeURL,
    Timestamp: (new Date()).toISOString(),
    SignatureVersion: '1',
    SigningCertURL: signingCertUrl
};

internals.validUnsubscribeConfirmation = {
    Type: 'UnsubscribeConfirmation',
    MessageId: internals.MessageId,
    Token: '0123456789abcdef',
    TopicArn: internals.TopicArn,
    Message: 'You have chosen to deactivate subscription...',
    SubscribeURL: internals.SubscribeURL,
    Timestamp: (new Date()).toISOString(),
    SignatureVersion: '1',
    SigningCertURL: signingCertUrl
};



const payloads = {
    SigningCertPathError: '/SimpleNotificationService-0123456789abcdef0123456789abcdee.pem',
    validNotificationSv1: internals.addSignature(internals.validNotificationSv1),
    validNotificationSv2: internals.addSignature(internals.validNotificationSv2, '2'),
    validNotificationWithSubject: internals.addSignature(internals.validNotificationWithSubject),
    validSubscriptionConfirmation: internals.addSignature(internals.validSubscriptionConfirmation),
    validUnsubscribeConfirmation: internals.addSignature(internals.validUnsubscribeConfirmation),

    invalidSignatureVersion: {
        Type: 'Notification',
        MessageId: internals.MessageId,
        TopicArn: internals.TopicArn,
        Message: 'Hello SNS!',
        Timestamp: (new Date()).toISOString(),
        SignatureVersion: '3',
        SigningCertURL: signingCertUrl
    },

    invalidType: {
        Type: 'Invalid',
        MessageId: internals.MessageId,
        TopicArn: internals.TopicArn,
        Message: 'Hello SNS!',
        Timestamp: (new Date()).toISOString(),
        SignatureVersion: '1',
        SigningCertURL: signingCertUrl
    },

    invalidSigningCertURL: {
        Type: 'Notification',
        MessageId: internals.MessageId,
        TopicArn: internals.TopicArn,
        Message: 'Hello SNS!',
        Timestamp: (new Date()).toISOString(),
        SignatureVersion: '1',
        SigningCertURL: 'https://badactor.com/SimpleNotificationService-0123456789abcdef0123456789abcdef.pem'
    },

    invalidSignature: {
        Type: 'Notification',
        MessageId: internals.MessageId,
        TopicArn: internals.TopicArn,
        Message: 'Hello SNS!',
        Timestamp: (new Date()).toISOString(),
        Signature: 'SGVsbG8gU05TIQo=',
        SignatureVersion: '1',
        SigningCertURL: signingCertUrl
    },

    invalidSignatureNull: {
        Type: 'Notification',
        MessageId: internals.MessageId,
        TopicArn: internals.TopicArn,
        Message: 'Hello SNS!',
        Timestamp: (new Date()).toISOString(),
        Signature: null,
        SignatureVersion: '1',
        SigningCertURL: signingCertUrl
    },

    throwError: {
        Type: 'Notification',
        MessageId: internals.MessageId,
        TopicArn: internals.TopicArn,
        Message: 'Hello SNS!',
        Timestamp: (new Date()).toISOString(),
        SignatureVersion: '1',
        SigningCertURL: signingCertHost +  '/SimpleNotificationService-0123456789abcdef0123456789abcdee.pem' }
};

export { payloads };

