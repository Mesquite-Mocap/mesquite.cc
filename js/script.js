// $('select').formSelect();



function time(text) {
  console.log('[' + new Date().toJSON().substr(11, 8) + '] ' + text);
}


function getMacFromBone(bone)
{
  var ret = null;
  var macs = Object.keys(mac2Bones);
  for(var i = 0; i < macs.length; i++){
    if(mac2Bones[macs[i]].id === bone){
      ret = macs[i];
      break;
    }
  }
  return ret;
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


