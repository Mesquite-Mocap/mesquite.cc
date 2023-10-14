var rigPrefix = "mixamorig";

const baudRates = [300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 74880, 115200, 230400, 250000, 500000, 1000000, 2000000];

var calibrated = false;
var initialPosition = {x:0, y:0, z:0}
var positionSensivity = 50;

function calibrate() {
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    mac2Bones[keys[i]].calibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].calibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].calibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].calibration.w = mac2Bones[keys[i]].last.w;
  }
}

function handleWSMessage(obj) {

  var bone = mac2Bones[obj.id].id;
  var x = model.getObjectByName(rigPrefix + bone);

  var currentQuaternion = new Quaternion(obj.x, obj.y, obj.z, obj.w);


  localQuaternion = currentQuaternion;


  mac2Bones[obj.id].last.x = localQuaternion.x;
  mac2Bones[obj.id].last.y = localQuaternion.y;
  mac2Bones[obj.id].last.z = localQuaternion.z;
  mac2Bones[obj.id].last.w = localQuaternion.w;

  var calibratedQuaternion = new Quaternion(
    mac2Bones[obj.id].calibration.x,
    mac2Bones[obj.id].calibration.y,
    mac2Bones[obj.id].calibration.z,
    mac2Bones[obj.id].calibration.w
  );


  localQuaternion = localQuaternion.mul(calibratedQuaternion.inverse());

  var currentLocalEuler = quaternionToEuler(localQuaternion)
  var parentQuaternion = getParentQuaternion(obj.id);

  if (obj.sensorPosition !== undefined) {
    if (initialPosition.x == 0 && initialPosition.y == 0 && initialPosition.z == 0) {
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

    var sensorPosition = new THREE.Vector3(obj.sensorPosition.x * positionSensivity - initialPosition.x, obj.sensorPosition.y * positionSensivity - initialPosition.y + 100, obj.sensorPosition.z * positionSensivity - initialPosition.z);
    //set this as position of the bone
    // console.log(sensorPosition);
    const hipsBone = model.getObjectByName(rigPrefix + "Hips");
    hipsBone.position.set(sensorPosition.z, sensorPosition.y, -sensorPosition.x);
  }

  if (parentQuaternion == null) {
    x.quaternion.set(localQuaternion.z, localQuaternion.x, -localQuaternion.y, localQuaternion.w);
    setLocal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
    setGlobal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
  } else {
    // console.log("localQuaternion ", localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
    // console.log("parentQuaternion ", parentQuaternion.x,parentQuaternion.y, parentQuaternion.z,parentQuaternion.w);


    var parentEuler = quaternionToEuler(parentQuaternion);
    // console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
    // console.log("parentEuler " + 180 * parentEuler.x / Math.PI, 180 * parentEuler.y / Math.PI, 180 * parentEuler.z / Math.PI);


    var newParentQuaternion = new Quaternion(parentQuaternion.w, parentQuaternion.x, parentQuaternion.y, parentQuaternion.z);
    var globalQuaternion = localQuaternion.mul(newParentQuaternion.inverse());
    // console.log("e1q", qR1.x,qR1.y, qR1.z,qR1.w);

    x.quaternion.set(globalQuaternion.z, globalQuaternion.x, -globalQuaternion.y, globalQuaternion.w);
    setLocal(obj.id, globalQuaternion.x, globalQuaternion.y, globalQuaternion.z, globalQuaternion.w);
    setGlobal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
  }
}

function quaternionToEuler(q) {
  var angles = {};
  var den = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  q.w /= den;
  q.x /= den;
  q.y /= den;
  q.z /= den;

  angles.x = Math.atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y));
  angles.y = Math.asin(2 * (q.w * q.y - q.z * q.x));
  angles.z = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));

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
  var id = dependencyGraph[[mac2Bones[child].id]];
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    if (mac2Bones[keys[i]].id == id) {
      if (mac2Bones[keys[i]].global.x == null) {
        return null;
      }
      return {
        x: mac2Bones[keys[i]].global.x,
        y: mac2Bones[keys[i]].global.y,
        z: mac2Bones[keys[i]].global.z,
        w: mac2Bones[keys[i]].global.w
      }
    }
  }
  return null;
}

function quatern2rotMat(q) {
  var R = [[], [], []];
  R[0][0] = 2 * Math.pow(q[0], 2) - 1 + 2 * Math.pow(q[1], 2);
  R[0][1] = 2 * (q[1] * q[2] + q[0] * q[3]);
  R[0][2] = 2 * (q[1] * q[3] - q[0] * q[2]);
  R[1][0] = 2 * (q[1] * q[2] - q[0] * q[3]);
  R[1][1] = 2 * Math.pow(q[0], 2) - 1 + 2 * Math.pow(q[2], 2);
  R[1][2] = 2 * (q[2] * q[3] + q[0] * q[1]);
  R[2][0] = 2 * (q[1] * q[3] + q[0] * q[2]);
  R[2][1] = 2 * (q[2] * q[3] - q[0] * q[1]);
  R[2][2] = 2 * Math.pow(q[0], 2) - 1 + 2 * Math.pow(q[3], 2);
  return R;
}



function rotateQuaternion(originalQuaternion, rotationQuaternion) {
  const rotatedQuaternion = new THREE.Quaternion();
  rotatedQuaternion.multiplyQuaternions(rotationQuaternion, originalQuaternion);
  return rotatedQuaternion;
}



function mapPods() {
  var html = "";
  for (var i = 0; i < devices.length; i++) {
    html += "<div class='row pod pod" + i + "'>" +
      "<div class='podName col s6'>" + devices[i].name + "</div>"
      + "<div class='podMac col s6'>"
      + boneSelectMarkup + "</div>" +
      "</div>";
  }

  // console.log(html);

  document.getElementById("deviceMapList").innerHTML = html;
  if (devices.length == 0) {
    document.getElementById("noDevice").style.display = "block";
    document.getElementById("devicePresent").style.display = "none";

  }
  else {
    document.getElementById("noDevice").style.display = "none";
    document.getElementById("devicePresent").style.display = "block";
  }

  // init select

  var elems = document.querySelectorAll('select');
  var instances = M.FormSelect.init(elems, {});

  //open modal
  manageModal.open();

}


function boneSelectChanged(select) {
  var boneName = select.value;
  console.log(boneName);

  var podMac = select.parentNode.parentNode.parentNode.getElementsByClassName("podName")[0].innerHTML.replace("MM-", '');
  console.log(podMac);

  mac2Bones[podMac] = { id: boneName, calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: null, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, sensorPosition: { x: 0, y: 0, z: 0, w: 1 } };

  $("#deviceMapList select").each(function () {
    if (this !== select) {
      this.querySelectorAll("option[value='" + boneName + "']").forEach(function (option) {
        option.disabled = true;
      });
    }
  });

  //update select
  var elems = document.querySelectorAll('select');
  var instances = M.FormSelect.init(elems, {});

}

var boneSelectMarkup = "<select class='boneSelect' onchange='boneSelectChanged(this)'>" +
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
