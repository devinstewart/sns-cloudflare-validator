/**
 *  Code in this file was adapted from forge: https://github.com/digitalbazaar/forge
 *  New BSD License (3-clause)
 *  Copyright (c) 2010, Digital Bazaar, Inc.
 *  All rights reserved.
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Digital Bazaar, Inc. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *  WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *  DISCLAIMED. IN NO EVENT SHALL DIGITAL BAZAAR BE LIABLE FOR ANY
 *  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 *  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 *  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 *  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 *  -------------------------------------------------------------------------------
 *  PLEASE NOTE: Only the parts of the forge library that are needed for this
 *  project have been included here. Please see the original forge library for
 *  the full source code.
 */

const internals = {
    asn1: {
        Class: {
            UNIVERSAL: 0x00,
            CONTEXT_SPECIFIC: 0x80
        },
        Type: {
            INTEGER: 2,
            BITSTRING: 3,
            NULL: 5,
            OID: 6,
            SEQUENCE: 16,
            UTCTIME: 23,
            GENERALIZEDTIME: 24
        },
        copy: (obj, options) => {

            let copy;

            if (internals.util.isArray(obj)) {
                copy = [];
                for (let i = 0; i < obj.length; ++i) {
                    copy.push(internals.asn1.copy(obj[i], options, true));
                }

                return copy;
            }

            if (typeof obj === 'string') {
                return obj;
            }

            copy = {
                tagClass: obj.tagClass,
                type: obj.type,
                constructed: obj.constructed,
                composed: obj.composed,
                value: internals.asn1.copy(obj.value, options)
            };
            return copy;
        },
        create: (tagClass, type, constructed, value, options) => {

            if (internals.util.isArray(value)) {
                const tmp = [];
                for (let i = 0; i < value.length; ++i) {
                    if (value[i] !== undefined) {
                        tmp.push(value[i]);
                    }
                }

                value = tmp;
            }

            const obj = {
                tagClass,
                type,
                constructed,
                composed: constructed || internals.util.isArray(value),
                value
            };
            if (options && 'bitStringContents' in options) {
                obj.bitStringContents = options.bitStringContents;
                obj.original = internals.asn1.copy(obj, undefined);
            }

            return obj;
        },
        fromDer: (bytes, options) => {

            if (options === undefined) {
                options = {
                    strict: true,
                    parseAllBytes: true,
                    decodeBitStrings: true
                };
            }

            if (typeof bytes === 'string') {
                bytes = internals.util.createBuffer(bytes);
            }

            const value = internals.asn1._fromDer(bytes, bytes.length(), 0, options);
            return value;
        },
        oidToDer: (oid) => {

            const values = oid.split('.');
            const bytes = internals.util.createBuffer();
            bytes.putByte(40 * parseInt(values[0], 10) + parseInt(values[1], 10));
            let last;
            let valueBytes;
            let value;
            let b;
            for (let i = 2; i < values.length; ++i) {
                last = true;
                valueBytes = [];
                value = parseInt(values[i], 10);
                do {
                    b = value & 0x7F;
                    value = value >>> 7;
                    if (!last) {
                        b |= 0x80;
                    }

                    valueBytes.push(b);
                    last = false;
                } while (value > 0);

                for (let j = valueBytes.length - 1; j >= 0; --j) {
                    bytes.putByte(valueBytes[j]);
                }
            }

            return bytes;
        },
        toDer: (obj) => {

            const bytes = internals.util.createBuffer();
            let b1 = obj.tagClass | obj.type;
            const value = internals.util.createBuffer();

            if (obj.composed) {
                if (obj.constructed) {
                    b1 |= 0x20;
                }
                else {
                    value.putByte(0x00);
                }

                for (let i = 0; i < obj.value.length; ++i) {
                    if (obj.value[i] !== undefined) {
                        value.putBuffer(internals.asn1.toDer(obj.value[i]));
                    }
                }
            }
            else {
                value.putBytes(obj.value);
            }

            bytes.putByte(b1);
            if (value.length() <  127) {
                bytes.putByte(value.length() & 0x7F);
            }
            else {
                let len = value.length();
                let lenBytes = '';
                do {
                    lenBytes += String.fromCharCode(len & 0xFF);
                    len = len >>> 8;
                } while (len > 0);

                bytes.putByte(lenBytes.length | 0x80);
                for (let i = lenBytes.length - 1; i >= 0; --i) {
                    bytes.putByte(lenBytes.charCodeAt(i));
                }
            }

            bytes.putBuffer(value);
            return bytes;
        },
        validate: (obj, v, capture, errors) => {

            let rval = false;

            if ((obj.tagClass === v.tagClass || typeof (v.tagClass) === 'undefined') &&
                (obj.type === v.type || typeof (v.type) === 'undefined')) {
                if ((obj.constructed === v.constructed || typeof (v.constructed) === 'undefined')) {
                    rval = true;

                    if (v.value && internals.util.isArray(v.value)) {
                        let j = 0;
                        for (let i = 0; rval && i < v.value.length; ++i) {
                            rval = v.value[i].optional || false;
                            if (obj.value[j]) {
                                rval = internals.asn1.validate(obj.value[j], v.value[i], capture, errors);
                                if (rval) {
                                    ++j;
                                }
                                else if (v.value[i].optional) {
                                    rval = true;
                                }
                            }
                        }
                    }

                    if (rval && capture) {
                        if (v.capture) {
                            capture[v.capture] = obj.value;
                        }

                        if (v.captureAsn1) {
                            capture[v.captureAsn1] = obj;
                        }

                        if (v.captureBitStringValue && 'bitStringContents' in obj) {
                            capture[v.captureBitStringContents] = obj.bitStringContents;
                        }
                    }
                }
            }
            else if (errors) {
                if (obj.tagClass !== v.tagClass) {
                    errors.push(
                        '[' + v.name + '] ' +
                        'Expected tag class "' + v.tagClass + '", got "' +
                        obj.tagClass + '"'
                    );
                }

                if (obj.type !== v.type) {
                    errors.push(
                        '[' + v.name + '] ' +
                        'Expected type "' + v.type + '", got "' + obj.type + '"'
                    );
                }
            }

            return rval;
        },
        _checkBufferLength: (bytes, remaining, n) => {

            if (n > remaining) {
                const error = new Error('Too few bytes to parse DER.');
                error.available = bytes.length();
                error.remaining = remaining;
                error.requested = n;
                throw error;
            }
        },
        _fromDer: (bytes, remaining, depth, options) => {

            let start;
            internals.asn1._checkBufferLength(bytes, remaining, 2);
            const b1 = bytes.getByte();
            remaining--;
            const tagClass = (b1 & 0xC0);
            const type = (b1 & 0x1F);
            start = bytes.length();
            let length = internals.asn1._getValueLength(bytes, remaining);
            remaining -= start - bytes.length();

            let value;
            let bitStringContents;
            const constructed = ((b1 & 0x20) === 0x20);
            if (constructed) {
                value = [];
                while (length > 0) {
                    start = bytes.length();
                    value.push(internals.asn1._fromDer(bytes, length, depth + 1, options));
                    remaining -= start - bytes.length();
                    length -= start - bytes.length();
                }
            }

            if (value === undefined &&
                tagClass === internals.asn1.Class.UNIVERSAL &&
                type === internals.asn1.Type.BITSTRING) {
                bitStringContents = bytes.bytes(length);
            }

            if (value === undefined
                && options.decodeBitStrings &&
                tagClass === internals.asn1.Class.UNIVERSAL &&
                (type === internals.asn1.Type.BITSTRING ) &&
                length > 1) {
                const savedRead = bytes.read;
                const savedRemaining = remaining;
                let unused = 0;
                if (type === internals.asn1.Type.BITSTRING) {
                    internals.asn1._checkBufferLength(bytes, remaining, 1);
                    unused = bytes.getByte();
                    remaining--;
                }

                if (unused === 0) {
                    try {
                        start = bytes.length();
                        const subOptions = {
                            strict: true,
                            decodeBitStrings: true
                        };
                        const composed = internals.asn1._fromDer(bytes, remaining, depth + 1, subOptions);
                        let used = start - bytes.length();
                        remaining -= used;
                        if (type === internals.asn1.Type.BITSTRING) {
                            used++;
                        }

                        const tc = composed.tagClass;
                        if (used === length && tc === internals.asn1.Class.UNIVERSAL) {
                            value = [composed];
                        }
                    }
                    catch {
                        // no-op
                    }
                }

                if (value === undefined) {
                    bytes.read = savedRead;
                    remaining = savedRemaining;
                }

            }

            if (value === undefined) {
                value = bytes.getBytes(length);
                remaining -= length;
            }

            const asn1Options = bitStringContents === undefined ? null : { bitStringContents };
            return internals.asn1.create(tagClass, type, constructed, value, asn1Options);
        },
        _getValueLength: (bytes, remaining) => {

            const b2 = bytes.getByte();
            remaining--;
            let length;
            const longForm = b2 & 0x80;
            if (!longForm) {
                length = b2;
            }
            else {
                const longFormBytes = b2 & 0x7F;
                internals.asn1._checkBufferLength(bytes, remaining, longFormBytes);
                length = bytes.getInt(longFormBytes << 3);
            }

            return length;
        }
    },
    oids: {
        rsaEncryption: '1.2.840.113549.1.1.1'
    },
    pem: {
        decode: (str) => {

            const rval = [];

            const rMessage = /-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g;
            let match;
            while (true) { // eslint-disable-line no-constant-condition
                match = rMessage.exec(str);
                if (!match) {
                    break;
                }

                const type = match[1];
                const msg = {
                    type,
                    procType: null,
                    contentDomain: null,
                    dekInfo: null,
                    headers: [],
                    body: internals.util.decode64(match[3])
                };
                rval.push(msg);

                if (!match[2]) {
                    continue;
                }
            }

            if (rval.length === 0) {
                throw new Error('Invalid PEM formatted message.');
            }

            return rval;
        },
        encode: (msg) => {

            let rval = '-----BEGIN ' + msg.type + '-----\r\n';
            rval += internals.util.encode64(msg.body.data, 64) + '\r\n';
            rval += '-----END ' + msg.type + '-----\r\n';
            return rval;
        }
    },
    rsa: {
        publicKeyFromAsn1: (obj) => {

            const capture = {};
            let errors = [];
            if (internals.asn1.validate(obj, publicKeyValidator, capture, errors)) {
                obj = capture.rsaPublicKey;
            }

            errors = [];
            internals.asn1.validate(obj, rsaPublicKeyValidator, capture, errors);
            const n = internals.util.createBuffer(capture.publicKeyModulus).toHex();
            const e = internals.util.createBuffer(capture.publicKeyExponent).toHex();
            return {
                n,
                e
            };
        },
        publicKeyToAsn1: (key) => {

            return internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.SEQUENCE, true, [
                internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.SEQUENCE, true, [
                    internals.asn1.create(
                        internals.asn1.Class.UNIVERSAL, internals.asn1.Type.OID, false,
                        internals.asn1.oidToDer(internals.oids.rsaEncryption).getBytes()
                    ),
                    internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.NULL, false, '')
                ]),
                internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.BITSTRING, false, [
                    internals.rsa.publicKeyToRSAPublicKey(key)
                ])
            ]);
        },
        publicKeyToRSAPublicKey: (key) => {

            return  internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.SEQUENCE, true, [
                internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.INTEGER, false,
                    internals.rsa._hexToBytes(key.n)),
                internals.asn1.create(internals.asn1.Class.UNIVERSAL, internals.asn1.Type.INTEGER, false,
                    internals.rsa._hexToBytes(key.e))
            ]);
        },
        _hexToBytes: (hex) => {

            hex = '00' + hex;
            const bytes = internals.util.hexToBytes(hex);
            return bytes.substring(1);

        }
    },
    util: {
        createBuffer: (input) => {

            return new ByteStringBuffer(input);
        },
        decode64: (input) => {

            input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

            let output = '';
            let enc1;
            let enc2;
            let enc3;
            let enc4;
            let i = 0;

            while (i < input.length) {
                enc1 = internals.util._base64Idx[input.charCodeAt(i++) - 43];
                enc2 = internals.util._base64Idx[input.charCodeAt(i++) - 43];
                enc3 = internals.util._base64Idx[input.charCodeAt(i++) - 43];
                enc4 = internals.util._base64Idx[input.charCodeAt(i++) - 43];

                output += String.fromCharCode((enc1 << 2) | (enc2 >> 4));
                if (enc3 !== 64) {
                    output += String.fromCharCode(((enc2 & 15) << 4) | (enc3 >> 2));
                    if (enc4 !== 64) {
                        output += String.fromCharCode(((enc3 & 3) << 6) | enc4);
                    }
                }
            }

            return output;
        },
        encode64: (input, maxline) => {

            let line = '';
            let output = '';
            let chr1;
            let chr2;
            let chr3;
            let i = 0;
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);

                line += internals.util._base64.charAt(chr1 >> 2);
                line += internals.util._base64.charAt(((chr1 & 3) << 4) | (chr2 >> 4));
                line += internals.util._base64.charAt(((chr2 & 15) << 2) | (chr3 >> 6));
                line += internals.util._base64.charAt(chr3 & 63);

                if (maxline && line.length > maxline) {
                    output += line.substring(0, maxline) + '\r\n';
                    line = line.substring(maxline);
                }
            }

            output += line;
            return output;
        },
        hexToBytes: (hex) => {

            let rval = '';
            for (let i = 0; i < hex.length; i += 2) {
                rval += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
            }

            return rval;
        },
        isArray: (x) => {

            return Object.prototype.toString.call(x) === '[object Array]' || Array.isArray(x);
        },
        _base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
        _base64Idx: [
            62, -1, -1, -1, 63,
            52, 53, 54, 55, 56, 57, 58, 59, 60, 61,
            -1, -1, -1, 64, -1, -1, -1,
            0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12,
            13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
            -1, -1, -1, -1, -1, -1,
            26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
            39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
        ]
    },
    x509: {
        certificateFromAsn1: (obj) => {

            const capture = {};
            const errors = [];
            internals.asn1.validate(obj, x509CertificateValidator, capture, errors);
            const publicKeyObj = internals.rsa.publicKeyFromAsn1(capture.subjectPublicKeyInfo);
            return publicKeyObj;
        },
        publicKeyFromCertificatePem: (pem) => {

            const msg = internals.pem.decode(pem)[0];
            const obj = internals.asn1.fromDer(msg.body);
            return internals.x509.certificateFromAsn1(obj);
        },
        publicKeyToPem: (key) => {

            const msg = {
                type: 'PUBLIC KEY',
                body: internals.asn1.toDer(internals.rsa.publicKeyToAsn1(key))
            };
            return internals.pem.encode(msg);
        }
    }
};

class ByteStringBuffer {
    constructor(b) {

        this.data = '';
        this.read = 0;

        if (typeof b === 'string') {
            this.data = b;
        }

        this._constructedStringLength = 0;
    }
    bytes(count) {

        return this.data.slice(this.read, this.read + count);
    }
    clear() {

        this.data = '';
        this.read = 0;
        return this;
    }
    getByte() {

        return this.data.charCodeAt(this.read++);
    }
    getBytes(count) {

        let rval;
        if (count) {
            count = Math.min(this.length(), count);
            rval = this.data.slice(this.read, this.read + count);
            this.read += count;
        }
        else if (count === 0) {
            rval = '';
        }
        else {
            rval = this.data;
            this.clear();
        }

        return rval;
    }
    getInt(n) {

        let rval = 0;
        do {
            rval = (rval << 8) + this.data.charCodeAt(this.read++);
            n -= 8;
        } while (n > 0);

        return rval;
    }
    length() {

        return this.data.length - this.read;
    }
    putBuffer(buffer) {

        return this.putBytes(buffer.getBytes());
    }
    putByte(b) {

        return this.putBytes(String.fromCharCode(b));
    }
    putBytes(bytes) {

        this.data += bytes;
        this._optimizeConstructedString(bytes.length);
        return this;
    }
    toHex() {

        let rval = '';
        for (let i = this.read; i < this.data.length; ++i) {
            const b = this.data.charCodeAt(i);
            if (b < 16) {
                rval += '0';
            }

            rval += b.toString(16);
        }

        return rval;
    }
    _optimizeConstructedString(x) {

        this._constructedStringLength += x;
    }
}

const publicKeyValidator = {
    name: 'SubjectPublicKeyInfo',
    tagClass: internals.asn1.Class.UNIVERSAL,
    type: internals.asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: 'subjectPublicKeyInfo',
    value: [{
        name: 'SubjectPublicKeyInfo.AlgorithmIdentifier',
        tagClass: internals.asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
            name: 'AlgorithmIdentifier.algorithm',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.OID,
            constructed: false,
            capture: 'publicKeyOid'
        }]
    }, {
        name: 'SubjectPublicKeyInfo.subjectPublicKey',
        tagClass: internals.asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.BITSTRING,
        constructed: false,
        value: [{
            name: 'SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.SEQUENCE,
            constructed: true,
            optional: true,
            captureAsn1: 'rsaPublicKey'
        }]
    }]
};

const rsaPublicKeyValidator = {
    name: 'RSAPublicKey',
    tagClass: internals.asn1.Class.UNIVERSAL,
    type: internals.asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: 'RSAPublicKey.modulus',
        tagClass: internals.asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.INTEGER,
        constructed: false,
        capture: 'publicKeyModulus'
    }, {
        name: 'RSAPublicKey.exponent',
        tagClass: internals. asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.INTEGER,
        constructed: false,
        capture: 'publicKeyExponent'
    }]
};

const x509CertificateValidator = {
    name: 'Certificate',
    tagClass: internals.asn1.Class.UNIVERSAL,
    type: internals.asn1.Type.SEQUENCE,
    constructed: true,
    value: [{
        name: 'Certificate.TBSCertificate',
        tagClass: internals.asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.SEQUENCE,
        constructed: true,
        captureAsn1: 'tbsCertificate',
        value: [{
            name: 'Certificate.TBSCertificate.version',
            tagClass: internals.asn1.Class.CONTEXT_SPECIFIC,
            type: 0,
            constructed: true,
            optional: true,
            value: [{
                name: 'Certificate.TBSCertificate.version.integer',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.INTEGER,
                constructed: false,
                capture: 'certVersion'
            }]
        }, {
            name: 'Certificate.TBSCertificate.serialNumber',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.INTEGER,
            constructed: false,
            capture: 'certSerialNumber'
        }, {
            name: 'Certificate.TBSCertificate.signature',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.SEQUENCE,
            constructed: true,
            value: [{
                name: 'Certificate.TBSCertificate.signature.algorithm',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.OID,
                constructed: false,
                capture: 'certinfoSignatureOid'
            }, {
                name: 'Certificate.TBSCertificate.signature.parameters',
                tagClass: internals.asn1.Class.UNIVERSAL,
                optional: true,
                captureAsn1: 'certinfoSignatureParams'
            }]
        }, {
            name: 'Certificate.TBSCertificate.issuer',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: 'certIssuer'
        }, {
            name: 'Certificate.TBSCertificate.validity',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.SEQUENCE,
            constructed: true,
            value: [{
                name: 'Certificate.TBSCertificate.validity.notBefore (utc)',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.UTCTIME,
                constructed: false,
                optional: true,
                capture: 'certValidity1UTCTime'
            }, {
                name: 'Certificate.TBSCertificate.validity.notBefore (generalized)',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.GENERALIZEDTIME,
                constructed: false,
                optional: true,
                capture: 'certValidity2GeneralizedTime'
            }, {
                name: 'Certificate.TBSCertificate.validity.notAfter (utc)',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.UTCTIME,
                constructed: false,
                optional: true,
                capture: 'certValidity3UTCTime'
            }, {
                name: 'Certificate.TBSCertificate.validity.notAfter (generalized)',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.GENERALIZEDTIME,
                constructed: false,
                optional: true,
                capture: 'certValidity4GeneralizedTime'
            }]
        }, {
            name: 'Certificate.TBSCertificate.subject',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: 'certSubject'
        },
        publicKeyValidator,
        {
            name: 'Certificate.TBSCertificate.issuerUniqueID',
            tagClass: internals.asn1.Class.CONTEXT_SPECIFIC,
            type: 1,
            constructed: true,
            optional: true,
            value: [{
                name: 'Certificate.TBSCertificate.issuerUniqueID.id',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.BITSTRING,
                constructed: false,
                captureBitStringValue: 'certIssuerUniqueId'
            }]
        }, {
            name: 'Certificate.TBSCertificate.subjectUniqueID',
            tagClass: internals.asn1.Class.CONTEXT_SPECIFIC,
            type: 2,
            constructed: true,
            optional: true,
            value: [{
                name: 'Certificate.TBSCertificate.subjectUniqueID.id',
                tagClass: internals.asn1.Class.UNIVERSAL,
                type: internals.asn1.Type.BITSTRING,
                constructed: false,
                captureBitStringValue: 'certSubjectUniqueId'
            }]
        }, {
            name: 'Certificate.TBSCertificate.extensions',
            tagClass: internals.asn1.Class.CONTEXT_SPECIFIC,
            type: 3,
            constructed: true,
            captureAsn1: 'certExtensions',
            optional: true
        }]
    }, {
        name: 'Certificate.signatureAlgorithm',
        tagClass: internals.asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.SEQUENCE,
        constructed: true,
        value: [{
            name: 'Certificate.signatureAlgorithm.algorithm',
            tagClass: internals.asn1.Class.UNIVERSAL,
            type: internals.asn1.Type.OID,
            constructed: false,
            capture: 'certSignatureOid'
        }, {
            name: 'Certificate.TBSCertificate.signature.parameters',
            tagClass: internals.asn1.Class.UNIVERSAL,
            optional: true,
            captureAsn1: 'certSignatureParams'
        }]
    }, {
        name: 'Certificate.signatureValue',
        tagClass: internals.asn1.Class.UNIVERSAL,
        type: internals.asn1.Type.BITSTRING,
        constructed: false,
        captureBitStringValue: 'certSignature'
    }]
};

/**
 * Extract the public key from a certificate in PEM format
 * @param {string} pem - The certificate in PEM format
 * @returns {string} The public key in PEM format
 */
const publicKeyPemFromCertificatePem = (pem) => {

    const publicKey = internals.x509.publicKeyFromCertificatePem(pem);
    return internals.x509.publicKeyToPem(publicKey);
};

export { publicKeyPemFromCertificatePem };
