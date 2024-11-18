let port = null;

async function getSelectedPort()
{
  const port = await navigator.serial.requestPort();
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
  //options = {};

  try {
    await port.open(options);
    console.log('<CONNECTED>');
   // $(".usbstatus").removeClass("red").addClass("green");
    // store port in localStorage
    localStorage.setItem("port", port.getInfo().usbProductId);
    //calibrate();
    toggleUIConnected(true);
    $("body").addClass("connected");
  } catch (e) {
    console.error(e);
   // $(".usbstatus").removeClass("green").addClass("red");
    return;
  }

  while (port && port.readable) {
    const reader = port.readable.getReader();
    let line = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          toggleUIConnected(true);
          break;
        }
        line += new TextDecoder().decode(value);
        if (line.includes("\n")) {
          var txt = line.split("\n")[0];
          try{
            handleWSMessage(JSON.parse(txt));
          }catch(e){
            console.error(e);
          }
          line = line.slice(line.indexOf("\n") + 1);          
        }
      }
    } catch (e) {
      console.error(e);
      window.location.reload();
    } finally {
      reader.releaseLock();
    }
  }  
}

async function disconnectFromPort()
{
  const port = await getSelectedPort();
  await port.close();
  console.log("Disconnected from port");
  $(".usbstatus").removeClass("green").addClass("red");
}

function toggleConnect()
{
  if($("body").hasClass("connected")){
    window.location.reload();
  }
  if (port) {
    disconnectFromPort();
  } else {
    connectToPort();
  }
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


const butConnect = document.getElementById('linkPods');

document.addEventListener('DOMContentLoaded', () => {
  butConnect.addEventListener('click', toggleConnect);

  if (!('serial' in navigator)) {
    alert("Web Serial not supported. Please use Chrome 78+");
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


window.sWrite = function (data) {
  console.log(data);
  if (port) {
    var writer = port.writable.getWriter();
    var arrBuff = new TextEncoder().encode(data + '\n');
    writer.write(arrBuff); writer.releaseLock();
    }
} 