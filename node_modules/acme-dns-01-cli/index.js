'use strict';
/*global Promise*/

var Challenge = module.exports;

// If your implementation needs config options, set them. Otherwise, don't bother (duh).
Challenge.create = function (config) {

  var challenger = {};

  // Note: normally you'd these right in the method body, but for the sake of
  // "Table of Contents"-style documentation, I've pulled them out.

  // Note: All of these methods can be synchronous, async, Promise, and callback-style
  // (the calling functions check function.length and then Promisify accordingly)

  // Called when it's tiem to set the challenge
  challenger.set = function (opts, cb) {
    return Challenge._setDns(opts, cb);
  };

  // Called when it's time to remove the challenge
  challenger.remove = function (opts) {
    return Challenge._removeDns(opts);
  };

  // Optional (only really useful for http and testing)
  // Called when the challenge needs to be retrieved
  challenger.get = function (opts) {
    return Challenge._getDns(opts);
  };

  // Whatever you assign to 'options' will be merged into the incoming 'opts' beforehand
  // (for convenience, so you don't have to do the if (!x) { x = y; } dance)
  // (also, some defaults are layered, so it's good to set it any that you have)
  challenger.options = { debug: config.debug };

  return challenger;
};


// Show the user the token and key and wait for them to be ready to continue
Challenge._setDns = function (args, cb) {
  // if you need per-run / per-domain options set them in approveDomains() and they'll be on 'args' here.
  if (!args.challenge) {
    console.error("You must be using Greenlock v2.7+ to use greenlock-challenge-dns v3+");
    process.exit();
  }
  var ch = args.challenge;

  console.info("");
  console.info("[ACME dns-01 '" + ch.altname + "' CHALLENGE]");
  console.info("You're about to receive the following DNS query:");
  console.info("");
  console.info("\tTXT\t" + ch.dnsHost + "\t" + ch.dnsAuthorization + "\tTTL 60");
  console.info("");
  if (ch.debug) {
    console.info("Debug Info:");
    console.info("");
    console.info(JSON.stringify(dnsChallengeToJson(ch), null, '  ').replace(/^/gm, '\t'));
    console.info("");
  }
  console.info("Go set that DNS record, wait a few seconds for it to propagate, and then continue when ready");
  console.info("[Press the ANY key to continue...]");
  process.stdin.resume();
  process.stdin.once('data', function () {
    process.stdin.pause();
    cb(null, null);
  });
};

// might as well tell the user that whatever they were setting up has been checked
Challenge._removeDns = function (args) {
  var ch = args.challenge;
  console.info("");
  console.info("[ACME dns-01 '" + ch.altname + "' COMPLETE]: " + ch.status);
  console.info("Challenge complete. You may now remove the DNS-01 challenge record:");
  console.info("");
  console.info("\tTXT\t" + ch.altname + "\t" + ch.dnsAuthorization);
  console.info("");

  return null;
};

// This is implemented here for completeness (and perhaps some possible use in testing),
// but it's not something you would implement because the Greenlock server isn't the NameServer.
Challenge._getDns = function (args) {
  var ch = args.challenge;
  // because the way to mock a DNS challenge is weird
  var altname = (ch.altname || ch.dnsHost || ch.identifier.value);
  var dnsHost = (ch.dnsHost || ch.identifier.value);

  if (ch._test || !Challenge._getCache[ch.token]) {
    Challenge._getCache[ch.token] = true;
    console.info("");
    console.info("[ACME " + ch.type + " '" + altname + "' REQUEST]: " + ch.status);
    console.info("The '" + ch.type + "' challenge request has arrived!");
    console.info('dig TXT ' + dnsHost);
    console.info("(paste in the \"DNS Authorization\" you received a moment ago to respond)");
    process.stdout.write("> ");
  }

  return new Promise(function (resolve, reject) {
    process.stdin.resume();
    process.stdin.once('error', reject);
    process.stdin.once('data', function (chunk) {
      process.stdin.pause();

      var result = chunk.toString('utf8').trim();
      try {
        result = JSON.parse(result);
      } catch(e) {
        args.challenge.dnsAuthorization = result;
        result = args.challenge;
      }
      if (result.dnsAuthorization) {
        resolve(result);
        return;
      }

      // The return value will checked. It must not be 'undefined'.
      resolve(null);
    });
  });
};
Challenge._getCache = {};

function dnsChallengeToJson(ch) {
  return {
    type: ch.type
  , altname: ch.altname
  , identifier: ch.identifier
  , wildcard: ch.wildcard
  , expires: ch.expires
  , token: ch.token
  , thumbprint: ch.thumbprint
  , keyAuthorization: ch.keyAuthorization
  , dnsHost: ch.dnsHost
  , dnsAuthorization: ch.dnsAuthorization
  };
}
