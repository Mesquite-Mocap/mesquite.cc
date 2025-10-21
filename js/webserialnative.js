let port = null;

const butConnect = document.getElementById('linkPods');

document.addEventListener('DOMContentLoaded', () => {
  butConnect.addEventListener('click', toggleConnect);

  if (!('serial' in navigator)) {
    M.toast({ html: "Web serial is not supported<a class='btn green black-text' target='_blank' href='https://caniuse.com/web-serial'>Learn more </a>", displayLength: 500000, classes: "red black-text" });

  }

});


async function connectToPort(port) {
  port = port || await navigator.serial.requestPort();
  window.port = port;
  if (!port) {
    console.log("No port selected");
    return;
  }


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

  while (port && port.readable) {

    const reader = port.readable.getReader();
    let line = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          console.log("Reader done", done);
          $(".usbstatus").removeClass("green").addClass("red");
          break;
        }
        line += new TextDecoder().decode(value);
        if (line.includes("\n")) {
          var txt = line.split("\n")[0];
          txt = txt.trim().replace('"bone":"Hips"125', '"bone":"Hips"}');
           //console.log(txt);
          try {
            var l = JSON.parse(txt);
            handleWSMessage(l);
          } catch (e) {
            console.error(e);
          }
          line = line.slice(line.indexOf("\n") + 1);

        }
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

  console.log(port.getInfo().usbProductId);
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