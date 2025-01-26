let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;
let showCalibration = false;

let orientation = [0, 0, 0];
let quaternion = [1, 0, 0, 0];
let calibration = [0, 0, 0, 0];

const maxLogLength = 500;
const butConnect = document.getElementById('linkPods');



document.addEventListener('DOMContentLoaded', () => {
  butConnect.addEventListener('click', clickConnect);

  if (!('serial' in navigator)) {
    alert("Web Serial not supported. Please use Chrome 78+");
  }

});

/**
 * @name connect
 * Opens a Web Serial connection to a micro:bit and sets up the input and
 * output stream.
 */
window.writer = null;
async function connect() {
  // - Request a port and open a connection.
  port = await navigator.serial.requestPort();
  // - Wait for the port to open.toggleUIConnected
  await port.open({ baudRate: 2000000 });
  $("body").addClass("connected");


  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable
    .pipeThrough(new TransformStream(new LineBreakTransformer()));

  reader = inputStream.getReader();
  readLoop().catch(async function (error) {
    toggleUIConnected(false);
    await disconnect();
  });
}

/**
 * @name disconnect
 * Closes the Web Serial connection.
 */
async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => { });
    reader = null;
    inputDone = null;
  }

  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }

  await port.close();
  port = null;
  showCalibration = false;
}

/**
 * @name readLoop
 * Reads data from the input stream and displays it on screen.
 */
async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (value) {
      let plotdata;
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

const mpHands = window;
const Hands = mpHands.Hands;

function onHResults(results) {
  console.log(results);
}


var faceVideoOn = false;
var rhVideoOn = false;
var lhVideoOn = false;

function logData(line) {
  console.log(line);
  line = line.trim().replace('"bone":"Hips"125', '"bone":"Hips"}');
  try {
    var x = JSON.parse(line);
    // console.log(x);
    if (x.face) {
      var canvas = document.getElementById("facecanvas");
      var ctx = canvas.getContext("2d");
      var img = document.createElement("img");
      img.onload = function () {
        ctx.drawImage(img, 0, 0);
      }
      img.src = x.face;
      // capture stream
      if (!faceVideoOn) {
        faceVideoOn = true;
        var stream = canvas.captureStream();
        document.getElementById("facevideo").srcObject = stream;
        document.getElementById("facevideo").play();
        document.getElementById("facevideo").muted = true;
      }

      return;
    }
    if (x.hand) {
      if (x.hand == "right") {
        var canvas = document.getElementById("rhcanvas");
        var ctx = canvas.getContext("2d");
        var img = document.createElement("img");
        img.onload = async function () {
          ctx.drawImage(img, 0, 0);
        }
        img.src = x.image;
        if (!rhVideoOn) {
          rhVideoOn = true;
          var stream = canvas.captureStream();
          document.getElementById("rhvideo").srcObject = stream;
          document.getElementById("rhvideo").play();
          document.getElementById("rhvideo").muted = true;
        }
      }
      else if (x.hand == "left") {
        var canvas = document.getElementById("lhcanvas");
        var ctx = canvas.getContext("2d");
        var img = document.createElement("img");
        img.onload = function () {
          ctx.drawImage(img, 0, 0);
        }
        img.src = x.image;
        if (!lhVideoOn) {
          lhVideoOn = true;
          var stream = canvas.captureStream();
          document.getElementById("lhvideo").srcObject = stream;
          document.getElementById("lhvideo").play();
          document.getElementById("lhvideo").muted = true;
        }
      }
      return;
    }
    handleWSMessage(x);
  }
  catch (e) {
    console.log(e);
  }

}

function enableStyleSheet(node, enabled) {
  node.disabled = !enabled;
}


async function reset() {
  // Clear the data

}



async function clickConnect() {
  if (port) {
    await disconnect();
    toggleUIConnected(false);
    return;
  }

  await connect();

  reset();

  toggleUIConnected(true);
}


/**
 * @name changeBaudRate
 * Change handler for the Baud Rate selector.
 */
async function changeBaudRate() {
  saveSetting('baudrate', document.getElementById('baudRate').value);
}



/**
 * @name clickClear
 * Click handler for the clear button.
 */
async function clickClear() {
  reset();
}

/**
 * @name LineBreakTransformer
 * TransformStream to parse the stream into lines.
 */
class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = '';
  }

  transform(chunk, controller) {
    this.container += chunk;
    const lines = this.container.split('\n');
    this.container = lines.pop();
    lines.forEach(line => {
      controller.enqueue(line)
      logData(line);
    });
  }

  flush(controller) {
    controller.enqueue(this.container);
  }
}

function convertJSON(chunk) {
  try {
    let jsonObj = JSON.parse(chunk);
    jsonObj._raw = chunk;
    return jsonObj;
  } catch (e) {
    return chunk;
  }
}

function toggleUIConnected(connected) {
  let lbl = 'Link Pods <i class="material-icons left">settings_ethernet</i>';
  if (connected) {
    lbl = 'Start Over <i class="material-icons right large">refresh</i>';
    $(butConnect).addClass('red white-text').removeClass('white black-text');
    M.toast({ html: 'Connected to Dongle', classes: 'green text-enter' });
  }
  else {
    window.location.reload();
  }
  butConnect.innerHTML = lbl;
}

function initBaudRate() {
  for (let rate of baudRates) {
    var option = document.createElement("option");
    option.text = rate + " Baud";
    option.value = rate;
    baudRate.add(option);
  }
}




function saveSetting(setting, value) {
  window.localStorage.setItem(setting, JSON.stringify(value));
}




window.sWrite = function (data) {
  console.log(data);
  if (port) {
    var writer = port.writable.getWriter();
    var arrBuff = new TextEncoder().encode(data + '\n');
    writer.write(arrBuff); writer.releaseLock();
    }
} 