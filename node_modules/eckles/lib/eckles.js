'use strict';

var EC = module.exports;

var Enc = require('./encoding.js');
var PEM = require('./pem.js');
var SSH = require('./ssh.js');
var x509 = require('./x509.js');

// 1.2.840.10045.3.1.7
// prime256v1 (ANSI X9.62 named elliptic curve)
var OBJ_ID_EC  = '06 08 2A8648CE3D030107'.replace(/\s+/g, '').toLowerCase();
// 1.3.132.0.34
// secp384r1 (SECG (Certicom) named elliptic curve)
var OBJ_ID_EC_384 = '06 05 2B81040022'.replace(/\s+/g, '').toLowerCase();

// The one good thing that came from the b***kchain hysteria: good EC documentation
// https://davidederosa.com/basic-blockchain-programming/elliptic-curve-keys/

/*global Promise*/
EC.generate = function (opts) {
  return Promise.resolve().then(function () {
    var typ = 'ec';
    var format = opts.format;
    var encoding = opts.encoding;
    var priv;
    var pub = 'spki';

    if (!format) {
      format = 'jwk';
    }
    if (-1 !== [ 'spki', 'pkcs8', 'ssh' ].indexOf(format)) {
      format = 'pkcs8';
    }

    if ('pem' === format) {
      format = 'sec1';
      encoding = 'pem';
    } else if ('der' === format) {
      format = 'sec1';
      encoding = 'der';
    }

    if ('jwk' === format || 'json' === format) {
      format = 'jwk';
      encoding = 'json';
    } else {
      priv = format;
    }

    if (!encoding) {
      encoding = 'pem';
    }

    if (priv) {
      priv = { type: priv, format: encoding };
      pub = { type: pub, format: encoding };
    } else {
      // jwk
      priv = { type: 'sec1', format: 'pem' };
      pub = { type: 'spki', format: 'pem' };
    }

    return new Promise(function (resolve, reject) {
      return require('crypto').generateKeyPair(typ, {
        namedCurve: opts.crv || opts.namedCurve || 'P-256'
      , privateKeyEncoding: priv
      , publicKeyEncoding: pub
      }, function (err, pubkey, privkey) {
        if (err) { reject(err); }
        resolve({
          private: privkey
        , public: pubkey
        });
      });
    }).then(function (keypair) {
      if ('jwk' === format) {
        return {
          private: EC.importSync({ pem: keypair.private, format: priv.type })
        , public: EC.importSync({ pem: keypair.public, format: pub.type, public: true })
        };
      }

      if ('ssh' !== opts.format) {
        return keypair;
      }

      return {
        private: keypair.private
      , public: EC.exportSync({ jwk: EC.importSync({
          pem: keypair.public, format: format, public: true
        }), format: opts.format, public: true })
      };
    });
  });
};

EC.importSync = function importEcSync(opts) {
  if (!opts || !opts.pem || 'string' !== typeof opts.pem) {
    throw new Error("must pass { pem: pem } as a string");
  }
  if (0 === opts.pem.indexOf('ecdsa-sha2-')) {
    return SSH.parseSsh(opts.pem);
  }
  var pem = opts.pem;
  var u8 = PEM.parseBlock(pem).bytes;
  var hex = Enc.bufToHex(u8);
  var jwk = { kty: 'EC', crv: null, x: null, y: null };

  //console.log();
  if (-1 !== hex.indexOf(OBJ_ID_EC)) {
    jwk.crv = "P-256";

    // PKCS8
    if (0x02 === u8[3] && 0x30 === u8[6] && 0x06 === u8[8]) {
      //console.log("PKCS8", u8[3].toString(16), u8[6].toString(16), u8[8].toString(16));
      jwk = x509.parsePkcs8(u8, jwk);
    // EC-only
    } else if (0x02 === u8[2] && 0x04 === u8[5] && 0xA0 === u8[39]) {
      //console.log("EC---", u8[2].toString(16), u8[5].toString(16), u8[39].toString(16));
      jwk = x509.parseSec1(u8, jwk);
    // SPKI/PKIK (Public)
    } else if (0x30 === u8[2] && 0x06 === u8[4] && 0x06 === u8[13]) {
      //console.log("SPKI-", u8[2].toString(16), u8[4].toString(16), u8[13].toString(16));
      jwk = x509.parseSpki(u8, jwk);
    // Error
    } else {
      //console.log("PKCS8", u8[3].toString(16), u8[6].toString(16), u8[8].toString(16));
      //console.log("EC---", u8[2].toString(16), u8[5].toString(16), u8[39].toString(16));
      //console.log("SPKI-", u8[2].toString(16), u8[4].toString(16), u8[13].toString(16));
      throw new Error("unrecognized key format");
    }
  } else if (-1 !== hex.indexOf(OBJ_ID_EC_384)) {
    jwk.crv = "P-384";

    // PKCS8
    if (0x02 === u8[3] && 0x30 === u8[6] && 0x06 === u8[8]) {
      //console.log("PKCS8", u8[3].toString(16), u8[6].toString(16), u8[8].toString(16));
      jwk = x509.parsePkcs8(u8, jwk);
    // EC-only
    } else if (0x02 === u8[3] && 0x04 === u8[6] && 0xA0 === u8[56]) {
      //console.log("EC---", u8[3].toString(16), u8[6].toString(16), u8[56].toString(16));
      jwk = x509.parseSec1(u8, jwk);
    // SPKI/PKIK (Public)
    } else if (0x30 === u8[2] && 0x06 === u8[4] && 0x06 === u8[13]) {
      //console.log("SPKI-", u8[2].toString(16), u8[4].toString(16), u8[13].toString(16));
      jwk = x509.parseSpki(u8, jwk);
    // Error
    } else {
      //console.log("PKCS8", u8[3].toString(16), u8[6].toString(16), u8[8].toString(16));
      //console.log("EC---", u8[3].toString(16), u8[6].toString(16), u8[56].toString(16));
      //console.log("SPKI-", u8[2].toString(16), u8[4].toString(16), u8[13].toString(16));
      throw new Error("unrecognized key format");
    }
  } else {
    throw new Error("Supported key types are P-256 and P-384");
  }
  if (opts.public) {
    if (true !== opts.public) {
      throw new Error("options.public must be either `true` or `false` not ("
        + typeof opts.public + ") '" + opts.public + "'");
    }
    delete jwk.d;
  }
  return jwk;
};
EC.parse = function parseEc(opts) {
  return Promise.resolve().then(function () {
    return EC.importSync(opts);
  });
};
EC.toJwk = EC.import = EC.parse;

EC.exportSync = function (opts) {
  if (!opts || !opts.jwk || 'object' !== typeof opts.jwk) {
    throw new Error("must pass { jwk: jwk } as a JSON object");
  }
  var jwk = JSON.parse(JSON.stringify(opts.jwk));
  var format = opts.format;
  if (opts.public || -1 !== [ 'spki', 'pkix', 'ssh', 'rfc4716' ].indexOf(format)) {
    jwk.d = null;
  }
  if ('EC' !== jwk.kty) {
    throw new Error("options.jwk.kty must be 'EC' for EC keys");
  }
  if (!jwk.d) {
    if (!format || -1 !== [ 'spki', 'pkix' ].indexOf(format)) {
      format = 'spki';
    } else if (-1 !== [ 'ssh', 'rfc4716' ].indexOf(format)) {
      format = 'ssh';
    } else {
      throw new Error("options.format must be 'spki' or 'ssh' for public EC keys, not ("
        + typeof format + ") " + format);
    }
  } else {
    if (!format || 'sec1' === format) {
      format = 'sec1';
    } else if ('pkcs8' !== format) {
      throw new Error("options.format must be 'sec1' or 'pkcs8' for private EC keys, not '" + format + "'");
    }
  }
  if (-1 === [ 'P-256', 'P-384' ].indexOf(jwk.crv)) {
    throw new Error("options.jwk.crv must be either P-256 or P-384 for EC keys, not '" + jwk.crv + "'");
  }
  if (!jwk.y) {
    throw new Error("options.jwk.y must be a urlsafe base64-encoded either P-256 or P-384");
  }

  if ('sec1' === format) {
    return PEM.packBlock({ type: "EC PRIVATE KEY", bytes: x509.packSec1(jwk) });
  } else if ('pkcs8' === format) {
    return PEM.packBlock({ type: "PRIVATE KEY", bytes: x509.packPkcs8(jwk) });
  } else if (-1 !== [ 'spki', 'pkix' ].indexOf(format)) {
    return PEM.packBlock({ type: "PUBLIC KEY", bytes: x509.packSpki(jwk) });
  } else if (-1 !== [ 'ssh', 'rfc4716' ].indexOf(format)) {
    return SSH.packSsh(jwk);
  } else {
    throw new Error("Sanity Error: reached unreachable code block with format: " + format);
  }
};
EC.pack = function (opts) {
  return Promise.resolve().then(function () {
    return EC.exportSync(opts);
  });
};

EC.__thumbprint = function (jwk) {
  var str = '{"crv":"' + jwk.crv + '","kty":"EC","x":"' + jwk.x + '","y":"' + jwk.y + '"}';
  var buf = require('crypto').createHash('sha256')
    // alphabetically sorted keys [ 'crv', 'kty', 'x', 'y' ]
    .update(str)
    .digest()
  ;
  return Enc.bufToUrlBase64(buf);
};

EC.thumbprint = function (opts) {
  return Promise.resolve().then(function () {
    var jwk;
    if ('EC' === opts.kty) {
      jwk = opts;
    } else if (opts.jwk) {
      jwk = opts.jwk;
    } else {
      jwk = EC.importSync(opts);
    }
    return EC.__thumbprint(jwk);
  });
};

EC.toPem = EC.export = EC.pack;
