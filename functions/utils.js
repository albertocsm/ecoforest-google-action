const CryptoJS = require("crypto-js");

const stripAuthorizationHeader = (headers) => {
    if (!headers || typeof headers.authorization !== 'string') {
        throw new Error('Missing authorization header');
    }

    const authorizationIndex = headers.authorization.indexOf('http');
    if (authorizationIndex === -1) {
        throw new Error('Authorization header does not contain a device URL');
    }

    return headers.authorization.substring(authorizationIndex);
}

const getUserHash = (headers) => {
    const deviceApiBaseAddress = stripAuthorizationHeader(headers);
    return CryptoJS.MD5(deviceApiBaseAddress).toString();
}

const delay = (ms) => {
    return new Promise(res => setTimeout(res, ms));
};

exports.stripAuthorizationHeader = stripAuthorizationHeader;
exports.getUserHash = getUserHash;
exports.delay = delay;
