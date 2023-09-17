import { LRUCache } from 'lru-cache';
import { getKeys } from './keys';
import { publicKeyPemFromCertificatePem } from './forge';

const internals = {
    keys: [],
    certUrlPattern: /^https:\/\/sns\.[a-zA-Z0-9-]{3,}\.amazonaws\.com(\.cn)?\/SimpleNotificationService-[a-zA-Z0-9]{32}\.pem$/
};

internals.validateUrl = (url) => {

    return internals.certUrlPattern.test(url);
};

internals.str2ab = (str) => {

    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    let strLen = str.length;
    for (let i = 0; i < strLen; ++i) {
        strLen = str.length;
        bufView[i] = str.charCodeAt(i);
    }

    return buf;
};

internals.pem2ab = (str) => {

    // deepcode ignore RegExpBadCharRange: false positive
    const fullRegex = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----([0-9A-z\n\r+/=]+)-----END \1-----$/m;
    const match = str.match(fullRegex);
    const data = atob(match[2].replace(/[\r\n]/g, ''));
    const ab = internals.str2ab(data);
    return ab;
};

internals.fetchCert = async (certUrl, certCache) => {

    const resp = await fetch(certUrl);
    const certiciatePem = await resp.text();

    if (certCache) {
        certCache.set(certUrl, certiciatePem);
    }

    return certiciatePem;
};

internals.validateSignature = async (payload, certCache) => {

    if (payload.SignatureVersion !== '1' && payload.SignatureVersion !== '2') {
        throw new Error('Invalid SignatureVersion');
    }

    const certUrl = payload.SigningCertURL;

    if (!internals.validateUrl(certUrl)) {
        throw new Error('Invalid SigningCertURL');
    }

    const certiciatePem = certCache.get(certUrl) || await internals.fetchCert(certUrl, certCache);

    const publicKeyPem = publicKeyPemFromCertificatePem(certiciatePem);
    const publicKeyArrayBuffer = internals.pem2ab(publicKeyPem);

    const publicKey = await crypto.subtle.importKey(
        'spki',
        publicKeyArrayBuffer,
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: payload.SignatureVersion === '1' ? 'SHA-1' : 'SHA-256'
        },
        true,
        ['verify']
    );

    let message = '';

    for (const key of internals.keys) {
        if (key in payload) {
            message += `${key}\n${payload[key]}\n`;
        }
    }

    const messageArrayBuffer = internals.str2ab(message);
    const signatureArrayBuffer = internals.str2ab(atob(payload.Signature));

    const isValid = await crypto.subtle.verify(
        {
            name: 'RSASSA-PKCS1-v1_5',
            hash: payload.SignatureVersion === '1' ? 'SHA-1' : 'SHA-256'
        },
        publicKey,
        signatureArrayBuffer,
        messageArrayBuffer
    );

    if (!isValid) {
        throw new Error('Invalid Signature');
    }
};

const Validator = class {
    constructor({ useCache = true, maxCerts = 1000, autoSubscribe = true, autoReSubscibe = true } = {}) {

        if (typeof useCache !== 'boolean') {
            throw new Error('useCache must be a boolean');
        }

        if (Number.isInteger(maxCerts) === false || maxCerts < 1) {
            throw new Error('maxCerts must be a positive integer');
        }

        this.useCache = useCache;
        this.maxCerts = maxCerts;
        this.autoSubscribe = autoSubscribe;
        this.autoReSubscibe = autoReSubscibe;

        if (this.useCache) {
            this.certCache = new LRUCache({ max: this.maxCerts });
        }
    }

    async validate(request) {

        if (request.method !== 'POST') {
            throw new Error('Method must be POST');
        }

        let payload;
        try {
            payload = await request.json();
        }
        catch {
            throw new Error('Invalid JSON');
        }

        internals.keys = getKeys(payload.Type);

        await internals.validateSignature(payload, this.certCache);

        if ((this.autoSubscribe && payload.Type === 'SubscriptionConfirmation') ||
            (this.autoResubscribe && payload.Type === 'UnsubscribeConfirmation')) {
            await fetch(payload.SubscribeURL);
        }

        return payload;
    }
};

export { Validator };
