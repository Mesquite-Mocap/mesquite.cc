
const butConnect = document.getElementById('linkPods');

document.addEventListener('DOMContentLoaded', () => {
    butConnect.addEventListener('click', toggleConnect);
  
    if (!('serial' in navigator)) {
      alert("Web Serial not supported. Please use Chrome 78+");
    }
  
  });

let port = null;

async function getSelectedPort()
{
  port = await navigator.serial.requestPort();
  return port;
}

async function connectToPort(port)
{
   port = port ||  await getSelectedPort();


  if(!port){
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
          try{
            var l = JSON.parse(txt);
            //console.log(l);
            handleWSMessage(l);
          }catch(e){
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

async function disconnectFromPort()
{
    window.location.reload();
  const port = await getSelectedPort();
  await port.close();
  console.log("Disconnected from port");
  $(".usbstatus").removeClass("green").addClass("red");
}

function toggleConnect()
{
  if ($("body").hasClass("connected")) {
    window.location.reload();
    //disconnectFromPort();
  } else {
    connectToPort();
  }
}

function writeToPort(data)
{
    console.log(port);
  if (!port || !port.writable) {
    console.error("Port is not writable");
    return;
  }
  const writer = port.writable.getWriter();
  const encoder = new TextEncoder();
  writer.write(encoder.encode(data));
  writer.releaseLock();
}

navigator.serial.addEventListener("connect", (e) => {
    console.log("A serial port has been connected to the system: ", e);
    const port = e.target;    
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
      M.toast({ html: 'Connected to Dongle', classes: 'green text-enter' });
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