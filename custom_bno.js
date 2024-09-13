var rigPrefix = "mixamorig";

var calibrated = false;
var initialPosition = { x: 0, y: 0, z: 0 };
var positionSensivity = 50;

var kfx = new KalmanFilter();
var kfy = new KalmanFilter();
var kfz = new KalmanFilter();

var filtersx = {};
var filtersy = {};
var filtersz = {};

function adjustQuaternionForThickness(quaternion, thickness) {
  // Implement the logic to adjust the quaternion based on thickness
  // This is a placeholder implementation
  var scale = 1 + thickness; // Example: scale the quaternion components
  return new THREE.Quaternion(
    quaternion.x * scale,
    quaternion.y * scale,
    quaternion.z * scale,
    quaternion.w * scale
  );
}


function calibrate() {
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    mac2Bones[keys[i]].calibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].calibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].calibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].calibration.w = mac2Bones[keys[i]].last.w;
  }

  calibrated = true;
  line_tracker = [];
}

function lowerFirstLetter(string) {
  return string.charAt(0).toLowerCase() + string.slice(1);
}

// 3. Update Function
function updateTrackingLine(newHipPosition) {
  // Convert newHipPosition to an array and add it to positions
  line_tracker.push(newHipPosition.x, newHipPosition.y - 100, newHipPosition.z);

  // Optional: Limit the length of the line
  var maxLength = 10000; // maximum number of vertices
  if (line_tracker.length > maxLength * 3) {
    line_tracker.splice(0, 3); // remove the oldest vertex
  }

  // Update the line geometry
  trackingLine.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(line_tracker), 3)
  );
  trackingLine.geometry.attributes.position.needsUpdate = true;
  trackingLine.geometry.setDrawRange(0, line_tracker.length / 3);
}

function handleWSMessage(obj) {
  // console.log(mac2Bones[obj.id].id);

  //console.log(obj)
  var bone = obj.bone;
  var x = model.getObjectByName(rigPrefix + bone);
  // console.log(bone, x, lowerFirstLetter(bone));

  document.getElementById(lowerFirstLetter(bone) + "Batery").innerHTML =
    parseFloat(obj.batt) * 100;
  statsObjs[lowerFirstLetter(bone)].update();
  var currentQuaternion = new THREE.Quaternion(-obj.y, obj.w, -obj.x, -obj.z);

  if (bone == "Hips") {
   currentQuaternion =  new THREE.Quaternion(-obj.y, -obj.x, -obj.w, -obj.z);
  }
  else if(bone == "Spine"){
    currentQuaternion = new THREE.Quaternion(-obj.y, -obj.w, -obj.x, obj.z);
  }
  var localQuaternion = currentQuaternion;
  if (!mac2Bones[bone]) {
    mac2Bones[bone] = {};
    mac2Bones[bone].last = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].calibration = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].local = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].global = { x: 0, y: 0, z: 0, w: 1 };
  }
  // console.log(mac2Bones)


  var calibratedQuaternion = new THREE.Quaternion(
    mac2Bones[bone].calibration.x,
    mac2Bones[bone].calibration.y,
    mac2Bones[bone].calibration.z,
    mac2Bones[bone].calibration.w
  );



  localQuaternion = localQuaternion.multiply(calibratedQuaternion.invert());
  //localQuaternion = adjustQuaternionForThickness(localQuaternion, 0.1);

  //console.log(localQuaternion);
  mac2Bones[bone].last.x = localQuaternion.x;
  mac2Bones[bone].last.y = localQuaternion.y;
  mac2Bones[bone].last.z = localQuaternion.z;
  mac2Bones[bone].last.w = localQuaternion.w;


  if (obj.sensorPosition !== undefined) {
    obj.sensorPosition.x *= -1;
    if (
      initialPosition.x == 0 &&
      initialPosition.y == 0 &&
      initialPosition.z == 0
    ) {
      initialPosition.x = obj.sensorPosition.x * positionSensivity;
      initialPosition.y = obj.sensorPosition.y * positionSensivity;
      initialPosition.z = obj.sensorPosition.z * positionSensivity;
    }
    if (calibrated == true) {
      initialPosition.x = obj.sensorPosition.x * positionSensivity;
      initialPosition.y = obj.sensorPosition.y * positionSensivity;
      initialPosition.z = obj.sensorPosition.z * positionSensivity;
      calibrated = false;
    }

    var sensorPosition = new THREE.Vector3(
      obj.sensorPosition.x * positionSensivity - initialPosition.x,
      obj.sensorPosition.y * positionSensivity - initialPosition.y + 100,
      obj.sensorPosition.z * positionSensivity - initialPosition.z
    );
    //set this as position of the bone
    // console.log(sensorPosition);

    const hipsBone = model.getObjectByName(rigPrefix + "Hips");
    hipsBone.position.set(
      kfx.filter(sensorPosition.x),
      kfy.filter(sensorPosition.y),
      -kfz.filter(sensorPosition.z)
    );
    updateTrackingLine(hipsBone.position);
  }


  var parentQuaternion = getParentQuaternion(bone);
  console.log(localQuaternion, parentQuaternion);

  if (parentQuaternion == null) {

    //    var t = quaternionToCylinderOrientation(localQuaternion.w, localQuaternion.x, localQuaternion.y, localQuaternion.z, .01);
    //    localQuaternion = new THREE.Quaternion(t.x, t.y, t.z, t.w);




    x.quaternion.set(
      localQuaternion.x,
      localQuaternion.y,
      localQuaternion.z,
      localQuaternion.w
    );


    
  const euler = new THREE.Euler().setFromQuaternion(localQuaternion);
  if(filtersx[x.name]){
    x.rotation.x = filtersx[x.name].filter(euler.x);
  }
  else{
    filtersx[x.name] = new KalmanFilter();
    x.rotation.x = filtersx[x.name].filter(euler.x);
  }
  if(filtersy[x.name]){
    x.rotation.y = filtersy[x.name].filter(euler.y);
  }
  else{
    filtersy[x.name] = new KalmanFilter();
    x.rotation.y = filtersy[x.name].filter(euler.y);
  }
  if(filtersz[x.name]){
    x.rotation.z = filtersz[x.name].filter(euler.z);
  }
  else{
    filtersz[x.name] = new KalmanFilter();
    x.rotation.z = filtersz[x.name].filter(euler.z);
  }

  localQuaternion = new THREE.Quaternion().setFromEuler(x.rotation);




    setLocal(
      bone,
      localQuaternion.x,
      localQuaternion.y,
      localQuaternion.z,
      localQuaternion.w
    );
    setGlobal(
      bone,
      localQuaternion.x,
      localQuaternion.y,
      localQuaternion.z,
      localQuaternion.w
    );
  } else {
    var newParentQuaternion = new THREE.Quaternion(
      parentQuaternion.x,
      parentQuaternion.y,
      parentQuaternion.z,
      parentQuaternion.w
    );
    var globalQuaternion = newParentQuaternion
      .invert()
      .multiply(localQuaternion);

    // globalQuaternion = adjustQuaternionForThickness(globalQuaternion, 0.1);

    //  var t = quaternionToCylinderOrientation(globalQuaternion.w, globalQuaternion.x, globalQuaternion.y, globalQuaternion.z, .01);
    //  globalQuaternion = new THREE.Quaternion(t.x, t.y, t.z, t.w);

    x.quaternion.set(
      globalQuaternion.x,
      globalQuaternion.y,
      globalQuaternion.z,
      globalQuaternion.w
    );


    
    const euler = new THREE.Euler().setFromQuaternion(globalQuaternion);
  if(filtersx[x.name]){
    x.rotation.x = filtersx[x.name].filter(euler.x);
  }
  else{
    filtersx[x.name] = new KalmanFilter();
    x.rotation.x = filtersx[x.name].filter(euler.x);
  }
  if(filtersy[x.name]){
    x.rotation.y = filtersy[x.name].filter(euler.y);
  }
  else{
    filtersy[x.name] = new KalmanFilter();
    x.rotation.y = filtersy[x.name].filter(euler.y);
  }
  if(filtersz[x.name]){
    x.rotation.z = filtersz[x.name].filter(euler.z);
  }
  else{
    filtersz[x.name] = new KalmanFilter();
    x.rotation.z = filtersz[x.name].filter(euler.z);
  }

  globalQuaternion = new THREE.Quaternion().setFromEuler(x.rotation);

  


    setLocal(
      bone,
      globalQuaternion.x,
      globalQuaternion.y,
      globalQuaternion.z,
      globalQuaternion.w
    );
    setGlobal(
      bone,
      localQuaternion.x,
      localQuaternion.y,
      localQuaternion.z,
      localQuaternion.w
    );
  }
}

function quaternionToEuler(q) {
  var angles = {};
  var den = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  q.w /= den;
  q.x /= den;
  q.y /= den;
  q.z /= den;

  angles.x = Math.atan2(
    2 * (q.w * q.x + q.y * q.z),
    1 - 2 * (q.x * q.x + q.y * q.y)
  );
  angles.y = Math.asin(2 * (q.w * q.y - q.z * q.x));
  angles.z = Math.atan2(
    2 * (q.w * q.z + q.x * q.y),
    1 - 2 * (q.y * q.y + q.z * q.z)
  );

  return angles;
}

function setGlobal(id, x, y, z, w) {
  mac2Bones[id].global.x = x;
  mac2Bones[id].global.y = y;
  mac2Bones[id].global.z = z;
  mac2Bones[id].global.w = w;
}

function setLocal(id, x, y, z, w) {
  mac2Bones[id].local.x = x;
  mac2Bones[id].local.y = y;
  mac2Bones[id].local.z = z;
  mac2Bones[id].local.w = w;
}

function getParentQuaternion(child) {
  console.log(child);

  var id = dependencyGraph[child];
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    if (keys[i] == id) {
      if (mac2Bones[keys[i]].global.x == null) {
        return null;
      }
      return {
        x: mac2Bones[keys[i]].global.x,
        y: mac2Bones[keys[i]].global.y,
        z: mac2Bones[keys[i]].global.z,
        w: mac2Bones[keys[i]].global.w,
      };
    }
  }
  return null;
}

// function quatern2rotMat(q) {
//     var R = [[], [], []];
//     R[0][0] = 2 * Math.pow(q[0], 2) - 1 + 2 * Math.pow(q[1], 2);
//     R[0][1] = 2 * (q[1] * q[2] + q[0] * q[3]);
//     R[0][2] = 2 * (q[1] * q[3] - q[0] * q[2]);
//     R[1][0] = 2 * (q[1] * q[2] - q[0] * q[3]);
//     R[1][1] = 2 * Math.pow(q[0], 2) - 1 + 2 * Math.pow(q[2], 2);
//     R[1][2] = 2 * (q[2] * q[3] + q[0] * q[1]);
//     R[2][0] = 2 * (q[1] * q[3] + q[0] * q[2]);
//     R[2][1] = 2 * (q[2] * q[3] - q[0] * q[1]);
//     R[2][2] = 2 * Math.pow(q[0], 2) - 1 + 2 * Math.pow(q[3], 2);
//     return R;
// }

function rotateQuaternion(originalQuaternion, rotationQuaternion) {
  const rotatedQuaternion = new THREE.Quaternion();
  rotatedQuaternion.multiplyQuaternions(rotationQuaternion, originalQuaternion);
  return rotatedQuaternion;
}

function mapPods() {
  var html = "";
  for (var i = 0; i < devices.length; i++) {
    html +=
      "<div class='row pod pod" +
      i +
      "'>" +
      "<div class='podName col s6'>" +
      devices[i].name +
      "</div>" +
      "<div class='podMac col s6'>" +
      boneSelectMarkup +
      "</div>" +
      "</div>";
  }

  // console.log(html);

  document.getElementById("deviceMapList").innerHTML = html;
  if (devices.length == 0) {
    document.getElementById("noDevice").style.display = "block";
    document.getElementById("devicePresent").style.display = "none";
  } else {
    document.getElementById("noDevice").style.display = "none";
    document.getElementById("devicePresent").style.display = "block";
  }

  // init select

  var elems = document.querySelectorAll("select");
  var instances = M.FormSelect.init(elems, {});

  //open modal
  manageModal.open();
}

// class BoneData {
//     constructor(boneName) {
//         this.id = boneName;
//         this.calibration = new THREE.Quaternion(0, 0, 0, 1);
//         this.last = new THREE.Quaternion(0, 0, 0, 1);
//         this.global = new THREE.Quaternion(0, 0, 0, 1);
//         this.local = new THREE.Quaternion(0, 0, 0, 1);
//         this.sensorPosition = new THREE.Vector4(0, 0, 0, 1);
//     }
// }

function boneSelectChanged(select) {
  var boneName = select.value;
  // console.log(boneName);

  var podMac = select.parentNode.parentNode.parentNode
    .getElementsByClassName("podName")[0]
    .innerHTML.replace("MM-", "");
  // console.log(podMac);

  mac2Bones[podMac] = {
    id: boneName,
    calibration: { x: 0, y: 0, z: 0, w: 1 },
    last: { x: 0, y: 0, z: 0, w: 1 },
    global: { x: null, y: 0, z: 0, w: 1 },
    local: { x: 0, y: 0, z: 0, w: 1 },
    sensorPosition: { x: 0, y: 0, z: 0, w: 1 },
  };
  // mac2Bones[podMac] = new BoneData(boneName);
  $("#deviceMapList select").each(function () {
    if (this !== select) {
      this.querySelectorAll("option[value='" + boneName + "']").forEach(
        function (option) {
          option.disabled = true;
        }
      );
    }
  });

  //update select
  var elems = document.querySelectorAll("select");
  var instances = M.FormSelect.init(elems, {});
}

var boneSelectMarkup =
  "<select class='boneSelect' onchange='boneSelectChanged(this)'>" +
  "<option value='0'>Select Bone</option>" +
  "<option value='Head'>Head</option>" +
  "<option value='Spine'>Spine</option>" +
  "<option value='Hips'>Hips</option>" +
  "<option value='LeftArm'>LeftArm</option>" +
  "<option value='LeftForeArm'>LeftForeArm</option>" +
  "<option value='RightArm'>RightArm</option>" +
  "<option value='RightForeArm'>RightForeArm</option>" +
  "<option value='LeftUpLeg'>LeftUpLeg</option>" +
  "<option value='LeftLeg'>LeftLeg</option>" +
  "<option value='RightUpLeg'>RightUpLeg</option>" +
  "<option value='RightLeg'>RightLeg</option>" +
  "</select>";
