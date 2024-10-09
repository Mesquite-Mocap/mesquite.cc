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
  // statsObjs[lowerFirstLetter(bone)].update();

  if (bone == "Spine") {
    var currentQuaternion = new THREE.Quaternion(obj.w, -obj.x, obj.y, obj.z);
  } else {
    var currentQuaternion = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
  }

  if (
    bone == "LeftArm" ||
    bone == "RightArm" ||
    bone == "RightForeArm" ||
    bone == "LeftForeArm"
  ) {
    // var localQuaternion = currentQuaternion;
    const euler = new THREE.Euler(-Math.PI / 2, 0, Math.PI, "XYZ");
    const rotationQuaternion = new THREE.Quaternion().setFromEuler(euler);
    var localQuaternion = rotateQuaternion(
      currentQuaternion,
      rotationQuaternion
    );
  } else if (bone == "Spine") {
    const euler = new THREE.Euler(0, Math.PI / 2, Math.PI, "XYZ");
    const rotationQuaternion = new THREE.Quaternion().setFromEuler(euler);
    localQuaternion = rotateQuaternion(currentQuaternion, rotationQuaternion);
  } else {
    const euler = new THREE.Euler(-Math.PI / 2, 0, Math.PI, "XYZ");
    const rotationQuaternion = new THREE.Quaternion().setFromEuler(euler);
    var localQuaternion = rotateQuaternion(
      currentQuaternion,
      rotationQuaternion
    );
  }

  if (!mac2Bones[bone]) {
    mac2Bones[bone] = {};
    mac2Bones[bone].last = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].calibration = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].local = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].global = { x: 0, y: 0, z: 0, w: 1 };
  }
  // console.log(mac2Bones)
  mac2Bones[bone].last.x = localQuaternion.x;
  mac2Bones[bone].last.y = localQuaternion.y;
  mac2Bones[bone].last.z = localQuaternion.z;
  mac2Bones[bone].last.w = localQuaternion.w;

  var calibratedQuaternion = new THREE.Quaternion(
    mac2Bones[bone].calibration.x,
    mac2Bones[bone].calibration.y,
    mac2Bones[bone].calibration.z,
    mac2Bones[bone].calibration.w
  );

  localQuaternion = localQuaternion.multiply(calibratedQuaternion.invert());
  //console.log(localQuaternion);

  var currentLocalEuler = quaternionToEuler(localQuaternion);
  var parentQuaternion = getParentQuaternion(bone);
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
      sensorPosition.x,
      sensorPosition.y,
      -sensorPosition.z
    );
    updateTrackingLine(hipsBone.position);
  }

  if (parentQuaternion == null) {
    // console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
    // x.quaternion.set(localQuaternion.x, localQuaternion.z, -localQuaternion.y, localQuaternion.w);
    x.quaternion.set(
      localQuaternion.x,
      localQuaternion.y,
      localQuaternion.z,
      localQuaternion.w
    );
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
    // console.log("localQuaternion ", localQuaternion.x, localQuaternion.y , localQuaternion.z ,localQuaternion.w);
    // console.log("parentQuaternion ", parentQuaternion.x,parentQuaternion.y, parentQuaternion.z,parentQuaternion.w);

    var parentEuler = quaternionToEuler(parentQuaternion);
    // console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
    // console.log("parentEuler " + 180 * parentEuler.x / Math.PI, 180 * parentEuler.y / Math.PI, 180 * parentEuler.z / Math.PI);

    var newParentQuaternion = new THREE.Quaternion(
      parentQuaternion.x,
      parentQuaternion.y,
      parentQuaternion.z,
      parentQuaternion.w
    );
    var globalQuaternion = newParentQuaternion
      .invert()
      .multiply(localQuaternion);
    // console.log("newParentQuaternion", globalQuaternion.x,globalQuaternion.y, globalQuaternion.z,globalQuaternion.w);

    // x.quaternion.set(localQuaternion.x, localQuaternion.z, -localQuaternion.y, localQuaternion.w);
    x.quaternion.set(
      globalQuaternion.x,
      globalQuaternion.y,
      globalQuaternion.z,
      globalQuaternion.w
    );
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
