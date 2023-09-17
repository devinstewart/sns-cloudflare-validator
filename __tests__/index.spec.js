import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { unstable_dev } from 'wrangler';
import { payloads } from './mocks/payloads';

describe('test validate()', () => {

    let worker;
    beforeAll(async () => {

        worker = await unstable_dev('./__tests__/worker.js', {

            experimental: { disableExperimentalWarning: true }
        });
    });

    afterAll(async () => {

        await worker.stop();
    });

    it('succussfully validates Notification SignatureVersion 1', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.validNotificationSv1)
        });
        const json = await resp.json();

        expect(json).toStrictEqual(payloads.validNotificationSv1);
        expect(resp.status).toStrictEqual(200);
    });

    it('succussfully validates Notification SignatureVersion 2', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.validNotificationSv2)
        });
        const json = await resp.json();
        expect(json).toStrictEqual(payloads.validNotificationSv2);
        expect(resp.status).toStrictEqual(200);
    });

    it('succussfully validates Notification with Subject', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.validNotificationWithSubject)
        });
        const json = await resp.json();
        expect(json).toStrictEqual(payloads.validNotificationWithSubject);
        expect(resp.status).toStrictEqual(200);
    });

    it('succussfully validates SubscriptionConfirmation', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.validSubscriptionConfirmation)
        });
        const json = await resp.json();
        expect(json).toStrictEqual(payloads.validSubscriptionConfirmation);
        expect(resp.status).toStrictEqual(200);
    });

    it('succussfully validates UnsubscribeConfirmation', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.validUnsubscribeConfirmation)
        });
        const json = await resp.json();
        expect(json).toStrictEqual(payloads.validUnsubscribeConfirmation);
        expect(resp.status).toStrictEqual(200);
    });

    it('fails on invalid JSON', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: 'invalid'
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Invalid JSON');
        expect(resp.status).toStrictEqual(400);
    });

    it('fails on unsupported Type', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.invalidType)
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Invalid Type');
        expect(resp.status).toStrictEqual(400);
    });

    it('fails on invalid SignatureVersion', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.invalidSignatureVersion)
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Invalid SignatureVersion');
        expect(resp.status).toStrictEqual(400);
    });

    it('fails on invalid SigningCertURL', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.invalidSigningCertURL)
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Invalid SigningCertURL');
        expect(resp.status).toStrictEqual(400);
    });

    it('fails on invalid Signature', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.invalidSignature)
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Invalid Signature');
        expect(resp.status).toStrictEqual(400);
    });

    it('fails on null Signature', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'POST',
            body: JSON.stringify(payloads.invalidSignatureNull)
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Invalid Signature');
        expect(resp.status).toStrictEqual(400);
    });

    it('fails on a GET', async () => {

        const resp = await worker.fetch('https://127.0.0.1', {
            method: 'GET'
        });
        const text = await resp.text();
        expect(text).toStrictEqual('Method must be POST');
        expect(resp.status).toStrictEqual(400);
    });
});
