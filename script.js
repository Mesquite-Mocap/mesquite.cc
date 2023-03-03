const button = document.getElementById("getDetails");
const details = document.getElementById("details");

// // UUIDs for the service and characteristic
const serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const characteristicUuid = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

let devices = [];

button.addEventListener("click", async () => {
  try {
    // Request the Bluetooth device through browser
    // const device = await navigator.bluetooth.requestDevice({
    //   optionalServices: [serviceUuid],
    //   acceptAllDevices: true,
    // });

    const device1 = await navigator.bluetooth.requestDevice({
      optionalServices: [serviceUuid],
      acceptAllDevices: true,
    });
    console.log('Connected to device 1:', device1.name);
    devices.push(device1);

    // Request the second device
    // const device2 = await navigator.bluetooth.requestDevice({
    //   optionalServices: [serviceUuid],
    //   acceptAllDevices: true,
    // });
    // console.log('Connected to device 2:', device2.name);
    // devices.push(device2);

    devices.forEach(async device => {
      // Do something with the device, e.g. read a characteristic
      // device.gatt.connect()
      //   .then(server => {
      //     // Get the service
      //     return server.getPrimaryService(serviceUuid);
      //   })
      //   .then(service => {
      //     // Get the characteristic
      //     return service.getCharacteristic(characteristicUuid);
      //   })
      //   .then(characteristic => {
      //     // Read the value of the characteristic
      //     characteristic.startNotifications();
      //     return characteristic.readValue();
      //   })
      //   .then(value => {
      //     console.log('Value:', value);
      //   })
      //   .catch(error => {
      //     console.error('Error:', error);
      //   });

        // Connect to the GATT server
        // We also get the name of the Bluetooth device here
        let deviceName = device.gatt.device.name;
        const server = await device.gatt.connect();

        const service = await server.getPrimaryService(serviceUuid);
        const characteristic = await service.getCharacteristic(characteristicUuid);

        // Enable notifications for the characteristic
        await characteristic.startNotifications();

      // Listen for characteristic value changes
        characteristic.addEventListener('characteristicvaluechanged', event => {
          const value = event.target.value;
          const decoder = new TextDecoder('utf-8');
          const message = decoder.decode(value);

          // console.log('Received message:', new Date(), message);
          var obj = JSON.parse(message);
          console.log('Received message:', new Date(), obj);
          handleWSMessage(obj);
        });
    });

    // Connect to the GATT server
    // We also get the name of the Bluetooth device here
  //   let deviceName = device.gatt.device.name;
  //   const server = await device.gatt.connect();

  //   const service = await server.getPrimaryService(serviceUuid);
  //   const characteristic = await service.getCharacteristic(characteristicUuid);

  //   // Enable notifications for the characteristic
  //   await characteristic.startNotifications();

  // // Listen for characteristic value changes
  //   characteristic.addEventListener('characteristicvaluechanged', event => {
  //     const value = event.target.value;
  //     const decoder = new TextDecoder('utf-8');
  //     const message = decoder.decode(value);

  //     console.log('Received message:', new Date(), message);
  //   });

  } catch (err) {
    console.log(err);
    alert("An error occured while fetching device details");
  }
});