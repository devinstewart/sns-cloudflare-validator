import { describe, beforeAll, afterAll, it, expect, vi } from 'vitest';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import * as crypto from 'crypto';
import { Validator } from '../lib';
import { payloads } from './mocks/payloads';
import { cerificatePem } from './mocks/pems';
import { signingCertUrl } from './mocks/signingCertUrl';
import { signingCertHost } from './mocks/signingCertHost';

vi.stubGlobal('crypto', crypto);

describe('test validate locally', () => {

    let server;
    beforeAll( () => {

        server = setupServer(
            rest.get(signingCertUrl, (_req, res, ctx) => {

                return res(ctx.text(cerificatePem));
            }),
            rest.get(signingCertHost, (req, res, ctx) => {

                const query = req.url.searchParams;
                if (query.get('Action') === 'ConfirmSubscription' && query.get('MoreStuff') === 'MoreStuff') {
                    return res(ctx.text('OK'));
                }
            })
        );
        server.listen();
    });

    afterAll(() => {

        server.close();
    });

    it('succussfully validates Notification SignatureVersion 1', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.validNotificationSv1
        };
        const validator = new Validator();
        const payload = await validator.validate(request);
        expect(payload).toStrictEqual(payloads.validNotificationSv1);
    });

    it('succussfully validates Notification SignatureVersion 2', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.validNotificationSv2
        };
        const validator = new Validator();
        const payload = await validator.validate(request);
        expect(payload).toStrictEqual(payloads.validNotificationSv2);
    });

    it('succussfully validates Notification SignatureVersion 2', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.validNotificationSv2
        };
        const validator = new Validator({ useCache: false });
        const payload = await validator.validate(request);
        expect(payload).toStrictEqual(payloads.validNotificationSv2);
    });


    it('succussfully validates Notification with Subject', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.validNotificationWithSubject
        };
        const validator = new Validator();
        const payload = await validator.validate(request);
        expect(payload).toStrictEqual(payloads.validNotificationWithSubject);
    });

    it('succussfully validates SubscriptionConfirmation', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.validSubscriptionConfirmation
        };
        const validator = new Validator();
        const payload = await validator.validate(request);
        expect(payload).toStrictEqual(payloads.validSubscriptionConfirmation);
    });

    it('succussfully validates UnsubscribeConfirmation', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.validUnsubscribeConfirmation
        };
        const validator = new Validator();
        const payload = await validator.validate(request);
        expect(payload).toStrictEqual(payloads.validUnsubscribeConfirmation);
    });

    it('throws error when SignatureVersion is not 1 or 2', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.invalidSignatureVersion
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid SignatureVersion');
    });

    it('fails on invalid JSON', async () => {

        const request = {
            method: 'POST',
            body: () => 'invalid'
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid JSON');
    });

    it('fails on unsupported Type', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.invalidType
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid Type');
    });

    it('fails on invalid SignatureVersion', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.invalidSignatureVersion
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid SignatureVersion');
    });

    it('fails on invalid Signature', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.invalidSignature
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid Signature');
    });

    it('fails on invalid SigningCertURL', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.invalidSigningCertURL
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid SigningCertURL');
    });

    it('fails on a null Signature', async () => {

        const request = {
            method: 'POST',
            json: () => payloads.invalidSignatureNull
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid Signature');
    });
});

describe('test contructor options', () => {

    it('throws error when useCache is not a boolean', () => {

        expect(() => new Validator({ useCache: 'true' })).toThrow('useCache must be a boolean');
    });

    it('throws error when maxCerts is not a positive integer', () => {

        expect(() => new Validator({ maxCerts: '1000' })).toThrow('maxCerts must be a positive integer');
        expect(() => new Validator({ maxCerts: -1 })).toThrow('maxCerts must be a positive integer');
    });

    it('throws error when autoSubscribe is not a boolean', () => {

        expect(() => new Validator({ autoSubscribe: 'true' })).toThrow('autoSubscribe must be a boolean');
    });

    it('throws error when autoResubscribe is not a boolean', () => {

        expect(() => new Validator({ autoResubscribe: 'true' })).toThrow('autoResubscribe must be a boolean');
    });

    it('throws an error when method is not POST', async () => {

        const request = {
            method: 'GET',
            json: () => payloads.validNotificationSv1
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Method must be POST');
    });
});

describe('test failing certs', () => {

    it('throws an error on invalid cert', async () => {

        const server = setupServer(
            rest.get(signingCertUrl, (_req, res, ctx) => {

                return res(ctx.text('invalid'));
            })
        );

        server.listen();

        const request = {
            method: 'POST',
            json: () => payloads.validNotificationSv1
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Invalid PEM formatted message.');
        server.close();
    });

    it('throws an error when cert cannot be fetched', async () => {

        const server = setupServer(
            rest.get(signingCertUrl, (_req, res, ctx) => {

                return res(
                    ctx.status(400),
                    ctx.text('Bad Request')
                );
            })
        );

        server.listen();

        const request = {
            method: 'POST',
            json: () => payloads.validNotificationSv1
        };
        const validator = new Validator();
        await expect(validator.validate(request)).rejects.toThrow('Failed to fetch certificate');
        server.close();
    });
});
