// webserialnative.js (BINARY + UI, stable connect button)
// Binary format:
//   sync: 0xAA 0x55
//   len:  uint16 LE payload length
//   payload: ver(1)=1, gwFlags(1), tMs(u32), fps(u8), n(u8), n*24 recs, ck(u16)

let port = null;
let connecting = false;

const butConnect = document.getElementById("linkPods");

// ---- Config ----
const BAUD = 921600;
const ENABLE_JSON_FALLBACK = false; // keep false for max FPS
const MAX_BUFFER = 1 << 20; // 1MB
const DROP_OLD_FRAMES = true; // keep newest frame only (lowest latency)

// ---- RX/ERR monitors ----
let __rxFrames = 0;
let __parseErr = 0;

setInterval(() => {
  const n = __rxFrames;
  const e = __parseErr;
  __rxFrames = 0;
  __parseErr = 0;
  console.log("RX_FPS", n, "PARSE_ERR", e);

  const fpsEl = document.getElementById("rxFps");
  if (fpsEl) fpsEl.textContent = "RX FPS: " + n;

  const errEl = document.getElementById("rxParseErr");
  if (errEl) errEl.textContent = "PARSE ERR: " + e;
}, 1000);

document.addEventListener("DOMContentLoaded", () => {
  if (butConnect) butConnect.addEventListener("click", toggleConnect);

  if (!("serial" in navigator)) {
    if (window.M && M.toast) {
      M.toast({
        html: "Web serial is not supported",
        displayLength: 500000,
        classes: "red black-text",
      });
    }
  }
});

// ---------- Dispatch ----------
function dispatchFrame(frame) {
  __rxFrames++;

  if (typeof window.handleAggregate === "function") {
    window.handleAggregate(frame);
    return;
  }

  if (typeof window.handleWSMessage === "function") {
    if (frame && Array.isArray(frame.p)) {
      for (const row of frame.p) {
        if (!Array.isArray(row) || row.length < 8) continue;
        window.handleWSMessage({
          id: String(row[0]),
          count: row[1],
          millis: row[2],
          batt: row[3],
          x: row[4],
          y: row[5],
          z: row[6],
          w: row[7],
        });
      }
    } else {
      window.handleWSMessage(frame);
    }
  }
}

// ---------- Streaming buffer (low-GC) ----------
let buf = new Uint8Array(64 * 1024);
let w = 0; // write index
let r = 0; // read index

function ensureCapacity(extra) {
  const need = w + extra;
  if (need <= buf.length) return;

  // compact first
  if (r > 0) {
    buf.copyWithin(0, r, w);
    w -= r;
    r = 0;
    if (w + extra <= buf.length) return;
  }

  // grow
  let newLen = buf.length;
  while (newLen < w + extra) newLen *= 2;
  const nb = new Uint8Array(newLen);
  nb.set(buf.subarray(r, w), 0);
  w = w - r;
  r = 0;
  buf = nb;
}

function appendBytes(u8) {
  if (!u8 || u8.length === 0) return;
  ensureCapacity(u8.length);
  buf.set(u8, w);
  w += u8.length;

  if (w - r > MAX_BUFFER) {
    r = w;
  }
}

// ---------- Binary helpers ----------
function sum16(u8, start, end) {
  let s = 0;
  for (let i = start; i < end; i++) s = (s + u8[i]) & 0xffff;
  return s;
}

function findSync(start) {
  for (let i = start; i < w - 1; i++) {
    if (buf[i] === 0xaa && buf[i + 1] === 0x55) return i;
  }
  return -1;
}

function parseBinary() {
  while (true) {
    if (w - r < 4) return;

    const s = findSync(r);
    if (s < 0) {
      r = w > 0 ? w - 1 : 0;
      return;
    }
    r = s;

    if (w - r < 4) return;

    const payloadLen = buf[r + 2] | (buf[r + 3] << 8);
    if (payloadLen < 10) {
      __parseErr++;
      r += 1;
      continue;
    }

    const totalLen = 4 + payloadLen;
    if (w - r < totalLen) return;

    const payloadStart = r + 4;
    const payloadEnd = payloadStart + payloadLen;

    const next = r + totalLen;
    if (DROP_OLD_FRAMES && w - next >= 4 && buf[next] === 0xaa && buf[next + 1] === 0x55) {
      r = next;
      continue;
    }

    const payload = buf.subarray(payloadStart, payloadEnd);
    const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

    const ver = payload[0];
    if (ver !== 1) {
      __parseErr++;
      r += 2;
      continue;
    }

    const expectedCk = dv.getUint16(payload.length - 2, true);
    const actualCk = sum16(payload, 0, payload.length - 2);
    if (expectedCk !== actualCk) {
      __parseErr++;
      r += 1;
      continue;
    }

    const gwFlags = payload[1];
    const tMs = dv.getUint32(2, true);
    const fps = payload[6];
    const n = payload[7];

    let off = 8;
    const records = [];
    for (let k = 0; k < n; k++) {
      if (off + 24 > payload.length - 2) break;

      const id = payload[off + 0];
      const count = dv.getUint16(off + 1, true);
      const ms = dv.getUint32(off + 3, true);
      const batt = payload[off + 7];
      const qx = dv.getFloat32(off + 8, true);
      const qy = dv.getFloat32(off + 12, true);
      const qz = dv.getFloat32(off + 16, true);
      const qw = dv.getFloat32(off + 20, true);

      records.push([id, count, ms, batt, qx, qy, qz, qw]);
      off += 24;
    }

    dispatchFrame({
      t: tMs,
      fps: fps,
      gw: [(gwFlags & 1) ? 1 : 0, (gwFlags & 2) ? 1 : 0, (gwFlags & 4) ? 1 : 0],
      p: records,
    });

    r = next;

    if (r > 32768) {
      buf.copyWithin(0, r, w);
      w -= r;
      r = 0;
    }
  }
}

// ---------- Optional JSON fallback (off) ----------
const td = new TextDecoder();
let txtBuf = "";

function tryParseJsonLines() {
  const parts = txtBuf.split(/\r?\n/);
  txtBuf = parts.pop() || "";
  for (const line of parts) {
    const s = line.trim();
    if (!s || s[0] !== "{") continue;
    try {
      dispatchFrame(JSON.parse(s));
    } catch (_) {}
  }
}

// ---------- Connect / Read ----------
async function connectToPort(portIn) {
  if (connecting) return;
  connecting = true;

  try {
    port = portIn || (await navigator.serial.requestPort());
    window.port = port;
    if (!port) return;

    // Guard: don't re-open an already open port
    if (!port.readable) {
      await port.open({ baudRate: BAUD });
    }

    toggleUIConnected(true);
    document.body.classList.add("connected");
    $(".usbstatus").removeClass("red").addClass("green");

    const info = port.getInfo?.();
    if (info && info.usbProductId != null) {
      localStorage.setItem("port", String(info.usbProductId));
    }

    while (port && port.readable) {
      const reader = port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value || value.length === 0) continue;

          appendBytes(value);
          parseBinary();

          if (ENABLE_JSON_FALLBACK) {
            try {
              txtBuf += td.decode(value, { stream: true });
              tryParseJsonLines();
            } catch (_) {}
          }
        }
      } finally {
        reader.releaseLock();
      }
      break;
    }
  } catch (e) {
    console.error(e);
    $(".usbstatus").removeClass("green").addClass("red");
  } finally {
    connecting = false;
  }
}

function toggleConnect() {
  if (document.body.classList.contains("connected")) {
    window.location.reload();
  } else {
    connectToPort();
  }
}

// ---------- Write ----------
function writeToPort(data) {
  const p = window.port;
  if (!p || !p.writable) return;
  const writer = p.writable.getWriter();
  const encoder = new TextEncoder();
  writer.write(encoder.encode(data));
  writer.releaseLock();
}
window.sWrite = function (data) { writeToPort(data); };

// ---------- Auto reconnect ----------
navigator.serial.addEventListener("connect", (e) => {
  const p = e.target;
  const info = p.getInfo?.();
  if (info && String(info.usbProductId) === localStorage.getItem("port")) {
    connectToPort(p);
  }
});

navigator.serial.addEventListener("disconnect", () => {
  window.location.reload();
});

// ---------- UI ----------
function toggleUIConnected(connected) {
  let lbl = 'Link Pods <i class="material-icons left">settings_ethernet</i>';
  if (connected) {
    lbl = 'Start Over <i class="material-icons right large">refresh</i>';
    $(butConnect).addClass("red white-text").removeClass("white black-text");

    if (window.M && M.Toast) {
      M.Toast.dismissAll();
      M.toast({
        html: "Connected to Dongle",
        classes: "green toastheader",
        displayLength: 500000,
      });
    }

    $("#linkPods").removeClass("animate__pulse animate__infinite");
  } else {
    window.location.reload();
  }

  if (butConnect) butConnect.innerHTML = lbl;
}
