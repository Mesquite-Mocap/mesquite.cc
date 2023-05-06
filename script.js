const button = document.getElementById("getDetails");
const details = document.getElementById("details");

// UUIDs for the service and characteristic
const serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const characteristicUuid = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

let devices = [];
let device_characteristics = [];


// send ble message

function sendBLEMessage(message, device_index) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  device_characteristics[device_index].writeValue(data);
}

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

async function connect_aux(index) {
  exponentialBackoff(3 /* max retries */, 2 /* seconds delay */,
    async function toTry() {
      time('Connecting to Bluetooth Device... ');
      await devices[index].gatt.connect();
    },
    function success() {
      console.log('> Bluetooth Device connected. Try disconnect it now.');
    },
    function fail() {
      time('Failed to reconnect.');
    });
}

function onDisconnected(index) {
  console.log('> Bluetooth Device disconnected');
  connect_aux(index);
}

/* Utils */

// This function keeps calling "toTry" until promise resolves or has
// retried "max" number of times. First retry has a delay of "delay" seconds.
// "success" is called upon success.
async function exponentialBackoff(max, delay, toTry, success, fail) {
  try {
    const result = await toTry();
    success(result);
  } catch(error) {
    if (max === 0) {
      return fail();
    }
    time('Retrying in ' + delay + 's... (' + max + ' tries left)');
    setTimeout(function() {
      exponentialBackoff(--max, delay * 2, toTry, success, fail);
    }, delay * 1000);
  }
}

function time(text) {
  console.log('[' + new Date().toJSON().substr(11, 8) + '] ' + text);
}

async function connect() {
  try {
    manageModal.close();
    const device = await navigator.bluetooth.requestDevice({
      optionalServices: [serviceUuid],
      // acceptAllDevices: true,
      filters: [
        { namePrefix: "MM-" },
      ]
    }).catch(error => { console.log(error); });
      


  


    console.log('Connected to device : ', device.name);



    // Connect to the GATT server
    // We also get the name of the Bluetooth device here
    let deviceName = device.gatt.device.name;
    const server = await device.gatt.connect();

    const service = await server.getPrimaryService(serviceUuid);
    const characteristic = await service.getCharacteristic(characteristicUuid);

    // Enable notifications for the characteristic
    await characteristic.startNotifications();

    device_characteristics.push(characteristic);

    // Listen for characteristic value changes
    characteristic.addEventListener('characteristicvaluechanged', handleBLEMessage);
    var index = devices.indexOf(device);
    if (index == -1) {
      devices.push(device);
      sendBLEMessage("start", devices.length - 1);
      device.addEventListener('gattserverdisconnected', onDisconnected(index));
    }
    
    connect_aux(index);




  } catch (error) {
    console.error('An error occurred while connecting:', error);
  }

  mapPods(false);
}

function broadcastBLE(message)
{
  for (let i = 0; i < devices.length; i++) {
    sendBLEMessage(message, i);
  }
}

function handleBLEMessage(event) {
  const value = event.target.value;
  const decoder = new TextDecoder('utf-8');
  const message = decoder.decode(value);
  
  console.log(new Date(), message);
  if (message.split(" ").length == 5) {
    const [id, quatI, quatJ, quatK, quatReal] = message.split(" ");
    //check if id is not in  devices then add it
  
    const obj = {
      id: id,
      x: parseFloat(quatI),
      y: parseFloat(quatJ),
      z: parseFloat(quatK),
      w: parseFloat(quatReal)
    };
    
    if (mac2Bones[id] && mac2Bones[id].id !== "0") {
      handleWSMessage(obj);
    }
  }
  else {
    // message is space separated
    var obj = message.split(" ");
    mac_id = obj[0];
    obj.shift();
    obj.pop();
    // console.log(obj);
    //check the length of obj ==7 
    if (obj.length == 7) {
      if (mac2Bones[mac_id] !== undefined) {
        //create json object
        var json_obj = { id: mac_id, x: obj[0], y: obj[1], z: obj[2], w: obj[3], sensorPosition: { x: obj[4], y: obj[5], z: obj[6] } };
        // console.log(json_obj);
        handleWSMessage(json_obj);
      }
    }
  }
}

// Debounce the connect function
const debouncedConnect = debounce(connect, 300);

// Attach the debounced function to the button click event
window.addEventListener("load", function () {
  const button = document.getElementById("getDetails");
  if (button) {
    button.addEventListener('click', debouncedConnect);
  }
});


function getMac2Bone(mac){
  return localStorage.getItem(mac) || "0";
}

function setMac2Bone(mac, bone){
  localStorage.setItem(mac, bone);
}
// function processMessageQueue() {
//   while (messageQueue.length > 0) {
//     const message = messageQueue.shift();

//     if (message.split(" ").length == 5) {
     
//   }
// }

// Call processMessageQueue every 50 milliseconds
// setInterval(processMessageQueue, 50);
