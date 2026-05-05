'use strict';

var SSH = module.exports;
var Enc = require('./encoding.js');

                      // 19  e  c  d  s  a  -  s  h  a  2  -  n  i  s  t  p  2  5  6
var SSH_EC_P256 = '00000013 65 63 64 73 61 2d 73 68 61 32 2d 6e 69 73 74 70 32 35 36'
  .replace(/\s+/g, '').toLowerCase();
                      // 19  e  c  d  s  a  -  s  h  a  2  -  n  i  s  t  p  3  8  4
var SSH_EC_P384 = '00000013 65 63 64 73 61 2d 73 68 61 32 2d 6e 69 73 74 70 33 38 34'
  .replace(/\s+/g, '').toLowerCase();

SSH.parseSsh = function (pem) {
  var jwk = { kty: 'EC', crv: null, x: null, y: null };
  var b64 = pem.split(/\s+/g)[1];
  var buf = Buffer.from(b64, 'base64');
  var hex = Enc.bufToHex(buf);
  var index = 40;
  var len;
  if (0 === hex.indexOf(SSH_EC_P256)) {
    jwk.crv = 'P-256';
    len = 32;
  } else if (0 === hex.indexOf(SSH_EC_P384)) {
    jwk.crv = 'P-384';
    len = 48;
  }
  var x = buf.slice(index, index + len);
  var y = buf.slice(index + len, index + len + len);
  jwk.x = Enc.bufToUrlBase64(x);
  jwk.y = Enc.bufToUrlBase64(y);
  return jwk;
};


SSH.packSsh = function (jwk) {
  // Custom SSH format
  var typ = 'ecdsa-sha2-nistp256';
	var a = '32 35 36';
  var b = '41';
  var comment = jwk.crv + '@localhost';
  if ('P-256' !== jwk.crv) {
    typ = 'ecdsa-sha2-nistp384';
    a = '33 38 34';
    b = '61';
  }
  var x = Enc.base64ToHex(jwk.x);
  var y = Enc.base64ToHex(jwk.y);
  var ssh = Enc.hexToUint8(
    ('00 00 00 13 65 63 64 73 61 2d 73 68 61 32 2d 6e 69 73 74 70'
    + a + '00 00 00 08 6e 69 73 74 70' + a + '00 00 00' + b
    + '04' + x + y).replace(/\s+/g, '').toLowerCase()
  );

  return typ + ' ' + Enc.bufToBase64(ssh) + ' ' + comment;
};
