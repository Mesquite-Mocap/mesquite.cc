let port = null;

const butConnect = document.getElementById('linkPods');

document.addEventListener('DOMContentLoaded', () => {
  butConnect.addEventListener('click', toggleConnect);

  if (!('serial' in navigator)) {
    M.toast({ html: "Web serial is not supported<a class='btn green black-text' target='_blank' href='https://caniuse.com/web-serial'>Learn more </a>", displayLength: 500000, classes: "red black-text" });

  }

});


// =========================================================================
//  WIRE FORMAT - dual mode
//  The dongle multiplexes two sources onto the same USB serial:
//    1. Pod data    -> 16-byte binary frames, sync 0xAA 0x55 (see Dongle.ino
//                      pod_packet_t and pod_watch.ino).
//    2. Phone (Hips) data -> JSON lines forwarded verbatim from the dongle's
//                      WebSocket handler. Always start with '{' and end '\n'.
//  We feed every incoming byte through one state machine that tells the two
//  apart by leading byte. Either path ultimately calls handleWSMessage()
//  with the same {bone,x,y,z,w,batt,count,millis,...} object shape.
// =========================================================================
const POD_PACKET_LEN = 16;
const SYNC0 = 0xAA;
const SYNC1 = 0x55;

// MUST match the bone-id table in pod_watch.ino and Dongle.ino.
const BONE_NAMES = [
  "Head",          //  0
  "Spine",         //  1
  "HipsAlt",       //  2
  "LeftArm",       //  3
  "LeftForeArm",   //  4
  "LeftHand",      //  5
  "RightArm",      //  6
  "RightForeArm",  //  7
  "RightHand",     //  8
  "LeftUpLeg",     //  9
  "LeftLeg",       // 10
  "LeftFoot",      // 11
  "RightUpLeg",    // 12
  "RightLeg",      // 13
  "RightFoot",     // 14
  "LeftShoulder",  // 15
  "RightShoulder", // 16
];

// Live bone-id histogram. Inspect from DevTools console:
//   window._podRx        -> { Head: 312, HipsAlt: 309, ... }
//   window._podRxByteId  -> { 0: 312, 2: 309, ... }
// Empty key for HipsAlt means the IMU pod is NOT reaching the browser.
window._podRx = {};
window._podRxByteId = {};

// Mode counters so you can confirm dual-mode parsing in a mixed deployment
// (some clients still run the old JSON-emitting firmware; we run binary).
//   window._rxMode.binary -> count of 16-byte binary frames decoded
//   window._rxMode.json   -> count of JSON lines decoded
// If both are climbing, you have a session with both firmwares feeding the
// same browser tab and the parser is happy. If one is stuck at 0, that
// flavour of pod/dongle isn't actually reaching the host.
window._rxMode = { binary: 0, json: 0 };

function unpackPodPacket(buf16) {
  const dv = new DataView(buf16.buffer, buf16.byteOffset, POD_PACKET_LEN);
  const id = buf16[2];
  window._podRxByteId[id] = (window._podRxByteId[id] || 0) + 1;
  const name = BONE_NAMES[id];
  if (!name) {
    if (typeof window._unknownIdLogged === 'undefined') window._unknownIdLogged = {};
    if (!window._unknownIdLogged[id]) {
      window._unknownIdLogged[id] = true;
      console.warn('[mocap] received unknown bone id ' + id + ' (no entry in BONE_NAMES). Pod firmware may be out of date or sync is misaligned.');
    }
    return null;
  }
  window._podRx[name] = (window._podRx[name] || 0) + 1;
  return {
    bone:   name,
    batt:   buf16[3] / 100,
    x:      dv.getInt16(4,  true) / 32767,
    y:      dv.getInt16(6,  true) / 32767,
    z:      dv.getInt16(8,  true) / 32767,
    w:      dv.getInt16(10, true) / 32767,
    count:  dv.getUint16(12, true),
    // ms_lo wraps every ~65 s. The display code in custom_icm.js treats
    // millis as "ms ago" and the original JSON path was already broken in
    // the same way, so we preserve behaviour and just hand it the low 16
    // bits. Latency UI is approximate; replace with a delta scheme later.
    millis: dv.getUint16(14, true),
  };
}

// Stream parser state. Held in module scope so it survives across reader.read()
// chunks (a single 16-byte frame can straddle two reads).
let _rxBuf = new Uint8Array(0);
let _jsonLine = "";

// Diagnostic surface. All of these are inspectable from DevTools so you can
// see whether the wire is alive even when the rig isn't moving:
//   window._rxBytes     -> total bytes read from serial (raw, pre-parse)
//   window._rxLines     -> total newline-terminated text lines seen
//   window._rxLast200   -> printable string of the most-recent ~200 bytes
//                          (useful to eyeball whether JSON is arriving and
//                          what it actually looks like when it does)
window._rxBytes = 0;
window._rxLines = 0;
window._rxLast200 = "";

function _recordTail(chunk) {
  // Cheap printable-only tail buffer. Non-printable bytes become `.`. We keep
  // ~200 chars so the user can paste/inspect what just came off the dongle.
  let s = "";
  for (let k = 0; k < chunk.length; k++) {
    const c = chunk[k];
    s += (c >= 0x20 && c < 0x7F) ? String.fromCharCode(c)
       : (c === 0x0A) ? "\n"
       : ".";
  }
  window._rxLast200 = (window._rxLast200 + s).slice(-200);
}

// Generalized bone-string repair. The legacy pod firmware sends a struct
// with `String bone`, which puts a heap pointer on the wire; the dongle
// dereferences garbage and produces lines like:
//   {"bone":"Spine"q\x12...,"x":0.1,...}
//   {"bone":"Hips"125,"x":...}
// The original parser only patched the Hips125 case. This regex tolerates
// ANY garbage between the closing quote of a known bone name and the next
// real JSON delimiter (`,` or `}`), and rewrites it to a clean form.
//
// Order in the alternation matters: longer names first so "HipsAlt" is
// matched before "Hips" would consume "Hips" out of "HipsAlt".
const _BONE_REPAIR_RE = /"bone":"(LeftForeArm|RightForeArm|LeftShoulder|RightShoulder|LeftUpLeg|RightUpLeg|LeftHand|RightHand|LeftArm|RightArm|LeftLeg|RightLeg|LeftFoot|RightFoot|HipsAlt|Spine|Head|Hips)"([^,}]*)/g;

// One-call diagnostic. Paste `_mocapDebug()` in DevTools to see the full
// pipeline state: how many bytes arrived, how many lines, how many parsed,
// what the most recent bad line looked like, per-bone counts, last 200 chars.
window._mocapDebug = function () {
  const out = {
    bytesReceived:   window._rxBytes,
    linesReceived:   window._rxLines || 0,
    jsonParsedOK:    window._rxMode.json,
    binaryFramesOK:  window._rxMode.binary,
    parseFailures:   window._jsonParseErr || 0,
    lastBadLineRaw:  window._lastBadLine || '(none)',
    lastBadLineFix:  window._lastBadLineRepaired || '(none)',
    perBone:         Object.assign({}, window._podRx),
    perBoneId:       Object.assign({}, window._podRxByteId),
    handlerErrors:   Object.assign({}, window._handleWSErr || {}),
    last200chars:    window._rxLast200,
  };
  console.table({
    bytes:  out.bytesReceived,
    lines:  out.linesReceived,
    jsonOK: out.jsonParsedOK,
    binOK:  out.binaryFramesOK,
    fails:  out.parseFailures,
  });
  console.log(out);
  return out;
};

// Some firmwares occasionally emit JavaScript-style `nan` / `inf` literals
// when the IMU's `sqrt(1 - q1^2 - q2^2 - q3^2)` underflows -- those aren't
// valid JSON so the line is rejected. Map them to `null` (parses cleanly,
// becomes NaN in JS via parseFloat, which is treated as a dead frame
// downstream). Word-boundary anchors so `"banana"` strings can't get hit.
const _NAN_RE = /:\s*-?nan\b/gi;
const _INF_RE = /:\s*-?inf(?:inity)?\b/gi;

function _repairLegacyJson(line) {
  // Drop trailing junk after the structural `}` if any (firmware sometimes
  // appends bytes past the real end of the JSON line).
  const lastBrace = line.lastIndexOf('}');
  if (lastBrace >= 0 && lastBrace < line.length - 1) {
    line = line.slice(0, lastBrace + 1);
  }
  // Strip junk between bone-name closing quote and the next , or }.
  line = line.replace(_BONE_REPAIR_RE, '"bone":"$1"');
  // Replace JS-style nan/inf with JSON null so JSON.parse accepts the line.
  // The downstream rig already tolerates a NaN quaternion component (the
  // adaptive slerp stays at the previous state for that frame).
  line = line.replace(_NAN_RE, ':null');
  line = line.replace(_INF_RE, ':null');
  return line;
}

function _appendBytes(chunk) {
  const out = new Uint8Array(_rxBuf.length + chunk.length);
  out.set(_rxBuf, 0);
  out.set(chunk, _rxBuf.length);
  _rxBuf = out;
}

function feedSerialBytes(chunk) {
  window._rxBytes += chunk.length;
  _recordTail(chunk);
  _appendBytes(chunk);
  let i = 0;
  while (i < _rxBuf.length) {
    const b = _rxBuf[i];

    // -- Branch A: binary pod frame --
    if (b === SYNC0 && _jsonLine.length === 0) {
      if (_rxBuf.length - i < 2) break;          // need next sync byte
      if (_rxBuf[i + 1] !== SYNC1) {              // false positive, skip 1
        i += 1;
        continue;
      }
      if (_rxBuf.length - i < POD_PACKET_LEN) break;  // need full frame
      const obj = unpackPodPacket(_rxBuf.subarray(i, i + POD_PACKET_LEN));
      if (obj) {
        window._rxMode.binary++;
        try {
          handleWSMessage(obj);
        } catch (e) {
          // Don't fully swallow -- log first occurrence per bone so a broken
          // bone surfaces in DevTools instead of silently going dark. This
          // is exactly the gap that hid the HipsAlt-not-mapping issue.
          if (typeof window._handleWSErr === 'undefined') window._handleWSErr = {};
          if (!window._handleWSErr[obj.bone]) {
            window._handleWSErr[obj.bone] = true;
            console.error('[mocap] handleWSMessage threw for bone "' + obj.bone + '":', e);
          }
        }
      }
      i += POD_PACKET_LEN;
      continue;
    }

    // -- Branch B: legacy JSON line (phone Hips path) --
    if (b === 0x7B /* '{' */ || _jsonLine.length > 0) {
      _jsonLine += String.fromCharCode(b);
      if (b === 0x0A /* '\n' */) {
        window._rxLines = (window._rxLines || 0) + 1;
        // Two-stage parse: try the line as-is; if it fails, run it through
        // the generalized bone-string repair (which handles Spine/Hips/etc.
        // String-corruption tails) and try again. Most dongles produce
        // already-clean lines on the order of >99% of frames, so the cheap
        // fast path is "JSON.parse and move on".
        const raw = _jsonLine.trim();
        _jsonLine = "";
        let j = null;
        try {
          j = JSON.parse(raw);
        } catch (e1) {
          const repaired = _repairLegacyJson(raw);
          try {
            j = JSON.parse(repaired);
          } catch (e2) {
            if (typeof window._jsonParseErr === 'undefined') window._jsonParseErr = 0;
            // Always record the most recent failure for offline inspection.
            window._lastBadLine = raw;
            window._lastBadLineRepaired = repaired;
            if (window._jsonParseErr++ < 5) {
              console.warn('[mocap] JSON parse failed twice. raw:', raw,
                           '| repaired:', repaired, '| err:', e2.message);
            }
          }
        }
        if (j) {
          // Drop quaternion frames where any of x/y/z/w is null/NaN. The
          // _repairLegacyJson step turns firmware-emitted `nan` literals
          // into JSON null so the line parses, but a NaN quaternion would
          // propagate through every dot product downstream. Better to
          // skip the frame -- adaptive slerp keeps the bone at its
          // previous state, which is what the user wants visually.
          const _isBadNum = function (v) {
            return v === null || v === undefined || (typeof v === 'number' && !isFinite(v));
          };
          if (_isBadNum(j.x) || _isBadNum(j.y) || _isBadNum(j.z) || _isBadNum(j.w)) {
            window._nanFrameDropped = (window._nanFrameDropped || 0) + 1;
          } else {
            window._rxMode.json++;
            if (j.bone) {
              window._podRx[j.bone] = (window._podRx[j.bone] || 0) + 1;
            }
            try {
              handleWSMessage(j);
            } catch (e) {
              if (typeof window._handleWSErr === 'undefined') window._handleWSErr = {};
              if (!window._handleWSErr[j.bone]) {
                window._handleWSErr[j.bone] = true;
                console.error('[mocap] handleWSMessage threw for JSON bone "' + j.bone + '":', e);
              }
            }
          }
        }
      }
      i += 1;
      continue;
    }

    // -- Junk byte (between frames, e.g. a stray newline from old firmware) --
    i += 1;
  }
  // Keep only the unconsumed tail; otherwise _rxBuf grows unbounded.
  _rxBuf = _rxBuf.subarray(i);
}

async function connectToPort(port) {
  port = port || await navigator.serial.requestPort();
  window.port = port;
  if (!port) {
    console.log("No port selected");
    return;
  }

  // Match the client's existing dongle firmware (`Serial.begin(115200)`).
  // ESP32-S3 native USB-CDC ignores baud, so this is essentially just a
  // label, but boards with a real UART bridge (CP2104/CH340) need an exact
  // match or you get garbled bytes. Stick with 115200 to mirror what the
  // deployed dongles use; the binary-mode dongle also opens 115200 unless
  // explicitly bumped.
  var options = { baudRate: 115200 };


  try {
    await port.open(options);
    toggleUIConnected(true);
    $("body").addClass("connected");

    $(".usbstatus").removeClass("red").addClass("green");
    // store port in localStorage
    localStorage.setItem("port", port.getInfo().usbProductId);
    //calibrate();
  } catch (e) {
    console.error(e);
    $(".usbstatus").removeClass("green").addClass("red");
    return;
  }

  // Reset stream state on every fresh connect so a stale partial frame from a
  // previous session doesn't poison the parser.
  _rxBuf = new Uint8Array(0);
  _jsonLine = "";

  while (port && port.readable) {
    const reader = port.readable.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Reader done", done);
          $(".usbstatus").removeClass("green").addClass("red");
          break;
        }
        // value is a Uint8Array; feed it through the dual-mode parser.
        feedSerialBytes(value);
      }
    } catch (e) {
      console.error(e);
      $(".usbstatus").removeClass("green").addClass("red");
    } finally {
      reader.releaseLock();
    }
  }
}

function toggleConnect() {
  if ($("body").hasClass("connected")) {
    window.location.reload();
  } else {
    connectToPort();
  }
}

function writeToPort(data) {
  var port = window.port;
  if (!port || !port.writable) {
    console.error("Port is not writable");
    return;
  }
  const writer = port.writable.getWriter();
  const encoder = new TextEncoder();
  writer.write(encoder.encode(data));
  writer.releaseLock();
}

window.sWrite = function (data) {
  writeToPort(data);
}

navigator.serial.addEventListener("connect", (e) => {
  console.log("A serial port has been connected to the system: ", e);
  port = e.target;

  // check if port matches the one in localStorage

  //console.log(port.getInfo().usbProductId);
  if (port.getInfo().usbProductId == localStorage.getItem("port")) {
    connectToPort(port);
  }
});

function toggleUIConnected(connected) {
  let lbl = 'Link Pods <i class="material-icons left">settings_ethernet</i>';
  if (connected) {
    lbl = 'Start Over <i class="material-icons right large">refresh</i>';
    $(butConnect).addClass('red white-text').removeClass('white black-text');
    M.Toast.dismissAll();
    M.toast({ html: 'Connected to Dongle', classes: 'green toastheader', displayLength: 500000 });
    M.toast({ html: "<p style='margin-right:20px;margin-top:0;margin-bottom:auto'>Continue with BOX CALIBRATION. Check your pod stats using the PODS button (top-right of the screen).</p><img style='width:80%' src='icons/bc.gif'>", displayLength: 500000, classes: "blue-grey lighten-4 black-text" });
    $("#linkPods").removeClass("animate__pulse animate__infinite");
  }
  else {
    window.location.reload();
  }
  butConnect.innerHTML = lbl;
}


navigator.serial.addEventListener("disconnect", (e) => {
  console.log("A serial port has been disconnected: ", e);
  window.location.reload();
});