const button = document.getElementById("getDetails");
const details = document.getElementById("details");

// // UUIDs for the service and characteristic
const serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const characteristicUuid = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

let devices = [];
let device_characteristics = [];



async function connect() {
  try {
    manageModal.close();
    const device = await navigator.bluetooth.requestDevice({
      optionalServices: [serviceUuid],
      // acceptAllDevices: true,
      filters: [
        { namePrefix: "MM-" },
      ]
    });
    console.log('Connected to device : ', device.name);
    if(!devices.includes(device)){
      devices.push(device);
    }

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
    characteristic.addEventListener('characteristicvaluechanged', event => {
      const value = event.target.value;
      const decoder = new TextDecoder('utf-8');
      const message = decoder.decode(value);

      // console.log(message);
      var obj = JSON.parse(message);
      console.log('Received message:', new Date(), message);
      handleWSMessage(obj);
    });


    // devices.forEach(async device => {
    //     // Connect to the GATT server
    //     // We also get the name of the Bluetooth device here
    //     let deviceName = device.gatt.device.name;
    //     const server = await device.gatt.connect();

    //     const service = await server.getPrimaryService(serviceUuid);
    //     const characteristic = await service.getCharacteristic(characteristicUuid);

    //     // Enable notifications for the characteristic
    //     await characteristic.startNotifications();

    //     var message = "Start Calibration";
    //     const encoder = new TextEncoder();
    //     const data = encoder.encode(message);
    //     characteristic.writeValue(data);

    //   // Listen for characteristic value changes
    //     characteristic.addEventListener('characteristicvaluechanged', event => {
    //       const value = event.target.value;
    //       const decoder = new TextDecoder('utf-8');
    //       const message = decoder.decode(value);

    //       // console.log(message);
    //       var obj = JSON.parse(message);
    //       console.log('Received message:', new Date(), message);
    //       handleWSMessage(obj);
    //     });
    // });
  } catch (err) {
    console.log(err);
    alert("An error occured while fetching device details");
  }
}

//const mpu_calibrate = document.getElementById("mpu_calibrate");

//mpu_calibrate.addEventListener("click", async () => {
  // devices.forEach(async device => {
  //   // Connect to the GATT server
  //   // We also get the name of the Bluetooth device here
  //   let deviceName = device.gatt.device.name;
  //   const server = await device.gatt.connect();

  //   const service = await server.getPrimaryService(serviceUuid);
  //   const characteristic = await service.getCharacteristic(characteristicUuid);

  //   // Enable notifications for the characteristic
  //   await characteristic.startNotifications();

  //   var message = "Start Calibration";
  //   const encoder = new TextEncoder();
  //   const data = encoder.encode(message);
  //   characteristic.writeValue(data);
  // });

//  device_characteristics.forEach(async characteristic => {
//    var message = "Start Calibration";
//    const encoder = new TextEncoder();
//    const data = encoder.encode(message);
//    characteristic.writeValue(data);
//  });
//});


