var rigPrefix = "mixamorig";

var calibrated = false;
var initialPosition = { x: 0, y: 0, z: 0 };

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
  var bone = obj.bone;
  var x = model.getObjectByName(rigPrefix + bone);
  // console.log(bone, x, lowerFirstLetter(bone));

   statsObjs[lowerFirstLetter(bone)].update();

  document.getElementById(lowerFirstLetter(bone) + "Batery").innerHTML =
    parseFloat(obj.batt) * 100;


  var rawQuaternion = new THREE.Quaternion(parseFloat(obj.x), parseFloat(obj.y), parseFloat(obj.z), parseFloat(obj.w));
  if(bone == "Hips"){
    rawQuaternion = new THREE.Quaternion(-parseFloat(obj.y), -parseFloat(obj.x), -parseFloat(obj.z), parseFloat(obj.w));
  }
  var refQuaternion = new THREE.Quaternion(0, 0, 0, 1);
  if (mac2Bones[bone] && mac2Bones[bone].calibration) {
    refQuaternion = new THREE.Quaternion(
      mac2Bones[bone].calibration.x,
      mac2Bones[bone].calibration.y,
      mac2Bones[bone].calibration.z,
      mac2Bones[bone].calibration.w
    );
  }

  if(bone == "Hips"){
    console.log(obj);
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion).normalize();
    var hipQ = new THREE.Quaternion(transformedQ.x, transformedQ.y, transformedQ.z, transformedQ.w).normalize();
    x.quaternion.copy(hipQ);
    transformedQ.copy(hipQ);
  }

  if (bone == "Spine") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var spineQ = new THREE.Quaternion(-transformedQ.x, -transformedQ.y, transformedQ.z, transformedQ.w);

    
    var hips = model.getObjectByName(rigPrefix + "Hips");
    var hipQ = new THREE.Quaternion().copy(hips.quaternion);
    var hipQinverse = new THREE.Quaternion().copy(hipQ).invert();
    var hipCorrection = new THREE.Quaternion().copy(hipQinverse).multiply(spineQ).normalize();


    x.quaternion.copy(hipCorrection);
    
   // transformedQ.copy(hipCorrection);
  }
  
  

  if (bone == "LeftArm") {
    /*
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var armQ = new THREE.Quaternion(-q.y, q.z, -q.x, q.w).normalize();
    x.quaternion.copy(armQ);
    */

    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var leftarmQ = new THREE.Quaternion(q.y, q.z, q.x , q.w).normalize();

    
    
    var spine = model.getObjectByName(rigPrefix + "Spine");
    var spineQ = new THREE.Quaternion().copy(spine.quaternion);
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(leftarmQ).normalize();

    x.quaternion.copy(spineCorrection);
    
  }


  if (bone == "LeftForeArm") {
    
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var leftforearmQ = new THREE.Quaternion(q.y, q.z, q.x, q.w).normalize();
    
    var leftArm = model.getObjectByName(rigPrefix + "LeftArm");
    var leftArmQ = new THREE.Quaternion().copy(leftArm.quaternion);
    var leftArmQinverse = new THREE.Quaternion().copy(leftArmQ).invert();
    var leftarmCorrection = new THREE.Quaternion().copy(leftArmQinverse).multiply(leftforearmQ).normalize();

    x.quaternion.copy(leftarmCorrection);
    
  }

  if (bone == "RightArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var rightarmQ = new THREE.Quaternion(-q.y, q.z, -q.x, q.w).normalize();

    
    var spine = model.getObjectByName(rigPrefix + "Spine");
    var spineQ = new THREE.Quaternion().copy(spine.quaternion);
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(rightarmQ).normalize();

    x.quaternion.copy(spineCorrection);
    

  }

  if (bone == "RightForeArm") {
    
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var rightforearmQ = new THREE.Quaternion(-q.y, q.z, -q.x, q.w).normalize();

    var rightArm = model.getObjectByName(rigPrefix + "RightArm");
    var rightArmQ = new THREE.Quaternion().copy(rightArm.quaternion);
    var rightArmQinverse = new THREE.Quaternion().copy(rightArmQ).invert();
    var rightArmCorrection = new THREE.Quaternion().copy(rightArmQinverse).multiply(rightforearmQ).normalize();

    x.quaternion.copy(rightArmCorrection);
    
    
  }
  if (bone == "LeftUpLeg") {
    
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var leftuplegQ = new THREE.Quaternion(-q.x, -q.y, q.z, q.w).normalize();

    
    
    var hips = model.getObjectByName(rigPrefix + "Hips");
    var hipsQ = new THREE.Quaternion().copy(hips.quaternion);
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(leftuplegQ).normalize();

    x.quaternion.copy(hipsCorrection);
    
    
  }

  if (bone == "LeftLeg") {
    
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var leftlegQ = new THREE.Quaternion(-q.x, -q.y, q.z, q.w).normalize();
    
     
    
    var leftupleg = model.getObjectByName(rigPrefix + "LeftUpLeg");
    var leftuplegQ = new THREE.Quaternion().copy(leftupleg.quaternion);
    var leftuplegQinverse = new THREE.Quaternion().copy(leftuplegQ).invert();
    var leftuplegCorrection = new THREE.Quaternion().copy(leftuplegQinverse).multiply(leftlegQ).normalize();

    x.quaternion.copy(leftuplegCorrection);
    
    
  }

  if (bone == "RightUpLeg") {
    
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var rightuplegQ = new THREE.Quaternion(-q.x, -q.y, q.z, q.w).normalize();
    
    
    var hips = model.getObjectByName(rigPrefix + "Hips");
    var hipsQ = new THREE.Quaternion().copy(hips.quaternion);
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(rightuplegQ).normalize();

    x.quaternion.copy(hipsCorrection);
    

    
  }

  if (bone == "RightLeg") {
    
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    var q = new THREE.Quaternion().copy(transformedQ);
    var rightlegQ = new THREE.Quaternion(-q.x, -q.y, q.z, q.w).normalize();

    
    
    var rightupleg = model.getObjectByName(rigPrefix + "RightUpLeg");
    var rightuplegQ = new THREE.Quaternion().copy(rightupleg.quaternion);
    var rightuplegQinverse = new THREE.Quaternion().copy(rightuplegQ).invert();
    var rightuplegCorrection = new THREE.Quaternion().copy(rightuplegQinverse).multiply(rightlegQ).normalize();

    x.quaternion.copy(rightuplegCorrection);
    
    
  }

  if (!mac2Bones[bone]) {
    mac2Bones[bone] = {};
    mac2Bones[bone].last = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].calibration = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].local = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].global = { x: 0, y: 0, z: 0, w: 1 };
  }
  // console.log(mac2Bones)
  mac2Bones[bone].last.x = transformedQ.x;
  mac2Bones[bone].last.y = transformedQ.y;
  mac2Bones[bone].last.z = transformedQ.z;
  mac2Bones[bone].last.w = transformedQ.w;

  // deal with hip position

  var positionSensivity = 50;

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
}

function swapXZAxesInQuaternion(quat) {
  // Create a quaternion representing a 90-degree rotation around the Y axis
  // This rotation swaps X and Z axes
  let swapQuat = new THREE.Quaternion();
  swapQuat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); // 90-degree rotation around Y
  // Apply the swap quaternion to the original quaternion
  let swappedQuat = quat.clone().premultiply(swapQuat); // Pre-multiply to apply rotation first
  return swappedQuat;
}
function swapXYAxesInQuaternion(quat) {
  // Create a quaternion representing a 90-degree rotation around the Z axis
  // This rotation swaps X and Y axes
  let swapQuat = new THREE.Quaternion();
  swapQuat.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2); // 90-degree rotation around Z
  // Apply the swap quaternion to the original quaternion
  let swappedQuat = quat.clone().premultiply(swapQuat); // Pre-multiply to apply rotation first
  return swappedQuat;
}
function swapYZAxesInQuaternion(quat) {
  // Create a quaternion representing a 90-degree rotation around the X axis
  // This rotation swaps Y and Z axes
  let swapQuat = new THREE.Quaternion();
  swapQuat.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // 90-degree rotation around X
  // Apply the swap quaternion to the original quaternion
  let swappedQuat = quat.clone().premultiply(swapQuat); // Pre-multiply to apply rotation first
  return swappedQuat;
}

var data56 = null;
function setBoneOrientation(bone, q) {
  bone.quaternion.set(q.x, q.y, q.z, q.w);
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
