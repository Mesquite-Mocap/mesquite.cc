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
    $(".usbstatus").removeClass("red").addClass("green");
    // store port in localStorage
    localStorage.setItem("port", port.getInfo().usbProductId);
    calibrate();
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
          try{
            hip = JSON.parse(txt);
          }catch(e){
            console.error(e);
          }
          isCalibrated = true;
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
  const port = await getSelectedPort();
  await port.close();
  console.log("Disconnected from port");
  $(".usbstatus").removeClass("green").addClass("red");
}

function toggleConnect()
{
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
