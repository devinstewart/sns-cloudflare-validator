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
            GENERALIZEDTIME: 24,
            BMPSTRING: 30
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
            if (options && !options.excludeBitStringContents) {
                copy.bitStringContents = obj.bitStringContents;
            }

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
        derToOid: (bytes) => {

            let oid;

            if (typeof bytes === 'string') {
                bytes = internals.util.createBuffer(bytes);
            }

            const b1 = bytes.getByte();
            oid = Math.floor(b1 / 40) + '.' + (b1 % 40);

            let value = 0;
            while (bytes.length() > 0) {
                const b = bytes.getByte();
                value = value << 7;
                if (b & 0x80) {
                    value += b & 0x7F;
                }
                else {
                    oid += '.' + (value + b);
                    value = 0;
                }
            }

            return oid;
        },
        equals: (obj1, obj2) => {

            if (internals.util.isArray(obj1)) {
                if (!internals.util.isArray(obj2)) {
                    return false;
                }

                if (obj1.length !== obj2.length) {
                    return false;
                }

                for (let i = 0; i < obj1.length; ++i) {
                    if (!internals.asn1.equals(obj1[i], obj2[i])) {
                        return false;
                    }
                }

                return true;
            }

            if (typeof obj1 !== typeof obj2) {
                return false;
            }

            if (typeof obj1 === 'string') {
                return obj1 === obj2;
            }

            return obj1.tagClass === obj2.tagClass &&
                obj1.type === obj2.type &&
                obj1.constructed === obj2.constructed &&
                obj1.composed === obj2.composed &&
                internals.asn1.equals(obj1.value, obj2.value);
        },
        fromDer: (bytes, options) => {

            if (options === undefined) {
                options = {
                    strict: true,
                    parseAllBytes: true,
                    decodeBitStrings: true
                };
            }

            if (typeof options === 'boolean') {
                options = {
                    strict: options,
                    parseAllBytes: true,
                    decodeBitStrings: true
                };
            }

            if (!('strict' in options)) {
                options.strict = true;
            }

            if (!('parseAllBytes' in options)) {
                options.parseAllBytes = true;
            }

            if (!('decodeBitStrings' in options)) {
                options.decodeBitStrings = true;
            }

            if (typeof bytes === 'string') {
                bytes = internals.util.createBuffer(bytes);
            }

            const byteCount = bytes.length();
            const value = internals.asn1._fromDer(bytes, bytes.length(), 0, options);
            if (options.parseAllBytes && bytes.length() !== 0) {
                const error = new Error('Unparsed DER bytes remain after ASN.1 parsing.');
                error.byteCount = byteCount;
                error.remaining = bytes.length();
                throw error;
            }

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
            let useBitStringContents = false;
            if ('bitStringContents' in obj) {
                useBitStringContents = true;
                if (obj.original) {
                    useBitStringContents = internals.asn1.equals(obj, obj.original);
                }
            }

            if (useBitStringContents) {
                value.putBytes(obj.bitStringContents);
            }
            else if (obj.composed) {
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
                if (obj.type === internals.asn1.Type.BMPSTRING) {
                    for (let i = 0; i < obj.value.length; ++i) {
                        value.putInt16(obj.value.charCodeAt(i));
                    }
                }
                else {
                    if (obj.type === internals.asn1.Type.INTEGER &&
                        obj.value.length > 1 &&
                        ((obj.value.charCodeAt(0) === 0 &&
                        (obj.value.charCodeAt(1) & 0x80) === 0) ||
                        (obj.value.charCodeAt(0) === 0xFF &&
                        (obj.value.charCodeAt(1) & 0x80) === 0x80))) {
                        value.putBytes(obj.value.substr(1));
                    }
                    else {
                        value.putBytes(obj.value);
                    }
                }
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

                            if (!rval && errors) {
                                errors.push(
                                    '[' + v.name + '] ' +
                                    'Tag class "' + v.tagClass + '", type "' +
                                    v.type + '" expected value length "' +
                                    v.value.length + '", got "' +
                                    obj.value.length + '"'
                                );
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

                        if (v.captureBitStringObject && 'bitStringContents' in obj) {
                            if (obj.bitStringContents.length < 2) {
                                capture[v.captureBitStringValue] = '';
                            }
                            else {
                                const unused = obj.bitStringContents.charCodeAt(0);
                                if (unused !== 0) {
                                    throw new Error('captureBitStringValue only supported for zero unused bits');
                                }

                                capture[v.captureBitStringValue] = obj.bitStringContents.slice(1);
                            }
                        }
                    }
                }
                else if (errors) {
                    errors.push(
                        '[' + v.name + '] ' +
                        'Expected constructed "' + v.constructed + '", got "' +
                        obj.constructed + '"'
                    );
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
            if (length !== undefined && length > remaining) {
                if (options.strict) {
                    const error = new Error('Too few bytes to read ASN.1 value.');
                    error.available = bytes.length();
                    error.remaining = remaining;
                    error.requested = length;
                    throw error;
                }

                length = remaining;
            }

            let value;
            let bitStringContents;
            const constructed = ((b1 & 0x20) === 0x20);
            if (constructed) {
                value = [];
                if (length === undefined) {
                    for (;;) {
                        internals.asn1._checkBufferLength(bytes, remaining, 2);
                        if (bytes.bytes(2) === String.fromCharCode(0, 0)) {
                            bytes.getBytes(2);
                            remaining -= 2;
                            break;
                        }

                        start = bytes.length();
                        value.push(internals.asn1._fromDer(bytes, remaining, depth + 1, options));
                        remaining -= start - bytes.length();
                    }
                }
                else {
                    while (length > 0) {
                        start = bytes.length();
                        value.push(internals.asn1._fromDer(bytes, length, depth + 1, options));
                        remaining -= start - bytes.length();
                        length -= start - bytes.length();
                    }
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
                        if (used === length &&
                            (
                                tc === internals.asn1.Class.UNIVERSAL ||
                                tc === internals.asn1.Class.CONTEXT_SPECIFIC
                            )
                        ) {
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
                if (length === undefined) {
                    if (options.strict) {
                        throw new Error('Non-constructed ASN.1 object of indefinite length.');
                    }

                    length = remaining;
                }

                if (type === internals.asn1.Type.BMPSTRING) {
                    value = '';
                    for (; length > 0; length -= 2) {
                        internals.asn1._checkBufferLength(bytes, remaining, 2);
                        value += String.fromCharCode(bytes.getInt16());
                        remaining -= 2;
                    }
                }
                else {
                    value = bytes.getBytes(length);
                    remaining -= length;
                }
            }

            const asn1Options = bitStringContents === undefined ? null : { bitStringContents };
            return internals.asn1.create(tagClass, type, constructed, value, asn1Options);
        },
        _getValueLength: (bytes, remaining) => {

            const b2 = bytes.getByte();
            remaining--;

            if (b2 === 0x80) {
                return undefined;
            }

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

            if (length < 0) {
                throw new Error('Negative length: ' + length);
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

            const rMessage = /\s*-----BEGIN ([A-Z0-9- ]+)-----\r?\n?([\x21-\x7e\s]+?(?:\r?\n\r?\n))?([:A-Za-z0-9+\/=\s]+?)-----END \1-----/g;
            const rHeader = /([\x21-\x7e]+):\s*([\x21-\x7e\s^:]+)/;
            const rCLRF = /\r?\n/;
            let match;
            while (true) { // eslint-disable-line no-constant-condition
                match = rMessage.exec(str);
                if (!match) {
                    break;
                }

                let type = match[1];
                if (type === 'NEW CERTIFICATE REQUEST') {
                    type = 'CERTIFICATE REQUEST';
                }

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

                const lines = match[2].split(rCLRF);
                let li = 0;
                while (match && li < lines.length) {
                    let line = lines[li].replace(/\s+$/, '');

                    for (let i = li + 1; i < lines.length; ++i) {
                        const next = lines[i];
                        if (!/\s/.test(next[0])) {
                            break;
                        }

                        line += next;
                        li = i;
                    }

                    match = line.match(rHeader);
                    if (match) {
                        const header = { name: match[1], values: [] };
                        const values = match[2].split(',');
                        for (let i = 0; i < values.length; ++i) {
                            header.values.push(internals.pem.ltrim[i]);
                        }

                        if (!msg.procType) {
                            if (header.name !== 'Proc-Type') {
                                throw new Error('Invalid PEM formatted message. The first encapsulated header must be "Proc-Type".');
                            }
                            else if (header.values.length !== 2) {
                                throw new Error('Invalid PEM formatted message. The "Proc-Type" header must have two subfields.');
                            }

                            msg.procType = { version: values[0], type: values[1] };
                        }
                        else if (!msg.contentDomain && header.name === 'Content-Domain') {
                            msg.contentDomain = values[0] || '';
                        }
                        else if (!msg.dekInfo && header.name === 'DEK-Info') {
                            if (header.values.length === 0) {
                                throw new Error('Invalid PEM formatted message. The "DEK-Info" header must have least one subfield.');
                            }

                            msg.dekInfo = { algorithm: values[0], parameters: values[1] || null };
                        }
                        else {
                            msg.headers.push(header);
                        }
                    }

                    ++li;
                }

                if (msg.procType === 'ENCRYPTED' && !msg.dekInfo) {
                    throw new Error('Invalid PEM formatted message. The "DEK-Info" header must be present if "Proc-Type" is "ENCRYPTED".');
                }
            }

            if (rval.length === 0) {
                throw new Error('Invalid PEM formatted message.');
            }

            return rval;
        },
        encode: (msg) => {

            let rval = '-----BEGIN ' + msg.type + '-----\r\n';
            let header;
            if (msg.procType) {
                header = {
                    name: 'Proc-Type',
                    values: [String(msg.procType.version), msg.procType.type]
                };
                rval + internals.pem.foldHeader(header);
            }

            if (msg.contentDomain) {
                header = { name: 'Content-Domain', values: [msg.contentDomain] };
                rval += internals.pem.foldHeader(header);
            }

            if (msg.dekInfo) {
                header = {
                    name: 'DEK-Info',
                    values: [msg.dekInfo.algorithm]
                };
                if (msg.dekInfo.parameters) {
                    header.values.push(msg.dekInfo.parameters);
                }

                rval += internals.pem.foldHeader(header);
            }

            if (msg.headers) {
                for (let i = 0; i < msg.headers.length; ++i) {
                    rval += internals.pem.foldHeader(msg.headers[i]);
                }
            }

            if (msg.procType) {
                rval += '\r\n';
            }

            rval += internals.util.encode64(msg.body.data, 64) + '\r\n';
            rval += '-----END ' + msg.type + '-----\r\n';
            return rval;
        },
        foldHeader: (header) => {

            let rval = header.name + ': ';
            const values = [];
            const insertSpace = (match, $1) => {

                return ' ' + $1;
            };

            for (let i = 0; i < header.values.length; ++i) {
                values.push(header.values[i].replace(/^(\S+\r\n)/, insertSpace));
            }

            rval += values.join(',') + '\r\n';

            let length = 0;
            let candidate = -1;
            for (let i = 0; i < rval.length; ++i, ++length) {
                if (length > 65 && candidate !== -1) {
                    const insert = rval[candidate];
                    if (insert === ',') {
                        ++candidate;
                        rval = rval.substr(0, candidate) + '\r\n ' + rval.substr(candidate);
                    }
                    else {
                        rval = rval.substr(0, candidate) + '\r\n' + insert + rval.substr(candidate + 1);
                    }

                    length = (i - candidate - 1);
                    candidate = -1;
                    ++i;
                }
                else if (rval[i] === ' ' || rval[i] === '\t' || rval[i] === ',') {
                    candidate = i;
                }
            }

            return rval;
        },
        ltrim: (str) => {

            return str.replace(/^\s+/, '');
        }
    },
    rsa: {
        publicKeyFromAsn1: (obj) => {

            const capture = {};
            let errors = [];
            if (internals.asn1.validate(obj, publicKeyValidator, capture, errors)) {
                const oid = internals.asn1.derToOid(capture.publicKeyOid);
                if (oid !== internals.oids.rsaEncryption) {
                    const error = new Error('Cannot read public key. Unknown OID.');
                    error.oid = oid;
                    throw error;
                }

                obj = capture.rsaPublicKey;
            }

            errors = [];
            if (!internals.asn1.validate(obj, rsaPublicKeyValidator, capture, errors)) {
                const error = new Error('Cannot read public key. ASN.1 object does not contain an RSAPublicKey.');
                error.errors = errors;
                throw error;
            }

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
            if (bytes.length > 1 &&
                ((bytes.charCodeAt(0) === 0 &&
                (bytes.charCodeAt(1) & 0x80) === 0) ||
                (bytes.charCodeAt(0) === 0xFF &&
                (bytes.charCodeAt(1) & 0x80) === 0x80))) {
                return bytes.substr(1);
            }

            return bytes;
        }
    },
    util: {
        createBuffer: (input, encoding) => {

            encoding = encoding || 'raw';
            if (input !== undefined && encoding === 'utf8') {
                input = internals.util.encodeUtf8(input);
            }

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
        decodeUtf8: (str) => {

            return decodeURIComponent(escape(str));
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
                if (isNaN(chr2)) {
                    line += '==';
                }
                else {
                    line += internals.util._base64.charAt(((chr2 & 15) << 2) | (chr3 >> 6));
                    line += isNaN(chr3) ? '=' : internals.util._base64.charAt(chr3 & 63);
                }

                if (maxline && line.length > maxline) {
                    output += line.substr(0, maxline) + '\r\n';
                    line = line.substr(maxline);
                }
            }

            output += line;
            return output;
        },
        encodeUtf8: (str) => {

            return unescape(encodeURIComponent(str));
        },
        hexToBytes: (hex) => {

            let rval = '';
            let i = 0;
            if (hex.length & 1 === 1) {
                i = 1;
                rval += String.fromCharCode(parseInt(hex[0], 16));
            }

            for (; i < hex.length; i += 2) {
                rval += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            }

            return rval;
        },
        isArray: (x) => {

            return Object.prototype.toString.call(x) === '[object Array]' || Array.isArray(x);
        },
        isArrayBuffer: (x) => {

            return typeof ArrayBuffer !== 'undefined' && x instanceof ArrayBuffer;
        },
        isArrayBufferView: (x) => {

            return x && internals.util.isArrayBuffer(x.buffer) && x.byteLength !== undefined;
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
        ],
        _checkBitsParam: (n) => {

            if (!(n === 8 || n === 16 || n === 24 || n === 32)) {
                throw new Error('Only 8, 16, 24, or 32 bits supported: ' + n);
            }
        }
    },
    x509: {
        certificateFromAsn1: (obj) => {

            const capture = {};
            const errors = [];
            if (!internals.asn1.validate(obj, x509CertificateValidator, capture, errors)) {
                const error = new Error('Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.');
                error.errors = errors;
                throw error;
            }

            const publicKeyObj = internals.rsa.publicKeyFromAsn1(capture.subjectPublicKeyInfo);
            return publicKeyObj;
        },
        publicKeyFromCertificatePem: (pem) => {

            const msg = internals.pem.decode(pem)[0];

            if (msg.type !== 'CERTIFICATE' &&
                msg.type !== 'X509 CERTIFICATE' &&
                msg.type !== 'TRUSTED CERTIFICATE') {
                const error = new Error(
                    'Could not convert certificate from PEM; PEM header type ' +
                    'is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".'
                );
                error.headerType = msg.type;
                throw error;
            }

            if (msg.procType && msg.procType.type === 'ENCRYPTED') {
                throw new Error('Could not convert certificate from PEM; PEM is encrypted.');
            }

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
        else if (internals.util.isArrayBuffer(b) || internals.util.isArrayBufferView(b)) {
            if (typeof Buffer !== 'undefined' && b instanceof Buffer) {
                this.data = b.toString('binary');
            }
            else {
                const arr = new Uint8Array(b);
                try {
                    this.data = String.fromCharCode.apply(null, arr);
                }
                catch {
                    for (let i = 0; i < arr.length; ++i) {
                        this.putByte(arr[i]);
                    }
                }
            }
        }
        else if (b instanceof ByteStringBuffer ||
            (typeof b === 'object' && typeof b.data === 'string' &&  typeof b.read === 'number')) {
            this.data = b.data;
            this.read = b.read;
        }

        this._constructedStringLength = 0;
    }
    bytes(count) {

        return (typeof (count) === 'undefined' ?
            this.data.slice(this.read) :
            this.data.slice(this.read, this.read + count));
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
            rval = (this.read === 0) ? this.data : this.data.slice(this.read);
            this.clear();
        }

        return rval;
    }
    getInt(n) {

        internals.util._checkBitsParam(n);
        let rval = 0;
        do {
            rval = (rval << 8) + this.data.charCodeAt(this.read++);
            n -= 8;
        } while (n > 0);

        return rval;
    }
    getInt16() {

        const rval = (
            (this.data.charCodeAt(this.read) << 8) ^
            this.data.charCodeAt(this.read + 1)
        );
        this.read += 2;
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
    putInt(i, n) {

        internals.util._checkBitsParam(n);
        let bytes = '';
        do {
            n -= 8;
            bytes += String.fromCharCode((i >> n) & 0xFF);
        } while (n > 0);

        return this.putBytes(bytes);
    }
    putInt16(i) {

        return this.putBytes(String.fromCharCode(
            String.fromCharCode(i >> 8 & 0xFF),
            String.fromCharCode(i & 0xFF)
        ));
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
    toString() {

        return internals.util.decodeUtf8(this.bytes());
    }
    _optimizeConstructedString(x) {

        const _MAX_CONSTRUCTED_STRING_LENGTH = 4096;
        this._constructedStringLength += x;
        if (this._constructedStringLength > _MAX_CONSTRUCTED_STRING_LENGTH) {
            // deepcode ignore PureMethodReturnValueIgnored: false positive
            this.data.substr(0, 1);
            this._constructedStringLength = 0;
        }
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

