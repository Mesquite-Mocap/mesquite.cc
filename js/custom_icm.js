var rigPrefix = "mm";

var calibrated = false;
initialPosition = { x: 0, y: 0, z: 0 };
var positionSensitivity = 64;

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

var flag = true;

function initGlobalLocalLast() {
  flag = false;
  var bone = model.getObjectByName(rigPrefix + "Hips");
  mac2Bones["Hips"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "Spine");
  mac2Bones["Spine"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Spine", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Spine", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Spine", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "Head");
  mac2Bones["Head"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Head", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Head", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Head", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftArm");
  mac2Bones["LeftArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftForeArm");
  mac2Bones["LeftForeArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightArm");
  mac2Bones["RightArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightForeArm");
  mac2Bones["RightForeArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftUpLeg");
  mac2Bones["LeftUpLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftLeg");
  mac2Bones["LeftLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightUpLeg");
  mac2Bones["RightUpLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightLeg");
  mac2Bones["RightLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftFoot");
  mac2Bones["LeftFoot"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightFoot");
  mac2Bones["RightFoot"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftHand");
  mac2Bones["LeftHand"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightHand");
  mac2Bones["RightHand"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

}



function calibrate() {
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    mac2Bones[keys[i]].calibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].calibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].calibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].calibration.w = mac2Bones[keys[i]].last.w;
  }

  //initialPosition = new THREE.Vector3(initialPosition.x, initialPosition.y, initialPosition.z).scale(positionSensitivity);
  calibrated = true;
  line_tracker = [];

  M.Toast.dismissAll();
  M.toast({ html: "T-Pose Set!", displayLength: 5000, classes: "green" });
  M.toast({ html: "Good luck with your capture! Don't forget to record it.", displayLength: 5000, classes: "" });
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
  if (flag) {
    initGlobalLocalLast();
  }
  var bone = obj.bone;
  var x = model.getObjectByName(rigPrefix + bone);
  // console.log(bone, x, lowerFirstLetter(bone));
  if (!bone || !x) {
    return;
  }

  mac2Bones[bone].last.x = parseFloat(obj.x);
  mac2Bones[bone].last.y = parseFloat(obj.y);
  mac2Bones[bone].last.z = parseFloat(obj.z);
  mac2Bones[bone].last.w = parseFloat(obj.w);


  statsObjs[lowerFirstLetter(bone)].update();

  document.getElementById(lowerFirstLetter(bone) + "Status").innerHTML = "<b class='green-text'>CONNECTED </b><br><span class='chip'>" +
    parseFloat(obj.batt) * 100 + "% battery</span>";
  $("#" + lowerFirstLetter(bone) + "Status").addClass("connected");



  var rawQuaternion = new THREE.Quaternion(parseFloat(obj.x), parseFloat(obj.y), parseFloat(obj.z), parseFloat(obj.w));
  // if (bone == "Hips") {
  //   rawQuaternion = new THREE.Quaternion(-parseFloat(obj.y), -parseFloat(obj.x), -parseFloat(obj.z), parseFloat(obj.w));
  //}
  var refQuaternion = new THREE.Quaternion(0, 0, 0, 1);
  if (mac2Bones[bone] && mac2Bones[bone].calibration) {
    refQuaternion = new THREE.Quaternion(
      mac2Bones[bone].calibration.x,
      mac2Bones[bone].calibration.y,
      mac2Bones[bone].calibration.z,
      mac2Bones[bone].calibration.w
    );
  }

  if (bone == "Hips") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    //    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);

    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var hipQ = new THREE.Quaternion(-transformedQ.x, transformedQ.y, -transformedQ.z, transformedQ.w).normalize();

    x.quaternion.copy(hipQ);
    setLocal(bone, hipQ.x, hipQ.y, hipQ.z, hipQ.w);
    setGlobal(bone, hipQ.x, hipQ.y, hipQ.z, hipQ.w);
  }

  if (bone == "Spine") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    // var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var spineQ = new THREE.Quaternion(transformedQ.x, -transformedQ.y, -transformedQ.z, transformedQ.w);

    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var spineQ = new THREE.Quaternion(transformedQ.x, transformedQ.z, -transformedQ.y, transformedQ.w);

    var obj = mac2Bones["Hips"].global;
    var hipQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var hipQinverse = new THREE.Quaternion().copy(hipQ).invert();
    var hipCorrection = new THREE.Quaternion().copy(hipQinverse).multiply(spineQ).normalize();

    x.quaternion.copy(hipCorrection);
    setLocal(bone, hipCorrection.x, hipCorrection.y, hipCorrection.z, hipCorrection.w);
    setGlobal(bone, spineQ.x, spineQ.y, spineQ.z, spineQ.w);
  }

  if (bone == "LeftArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);

    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var leftarmQ = new THREE.Quaternion(q.y, -q.z, -q.x, q.w).normalize();

    var obj = mac2Bones["Spine"].global;
    var spineQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(leftarmQ).normalize();

    x.quaternion.copy(spineCorrection);
    setLocal(bone, spineCorrection.x, spineCorrection.y, spineCorrection.z, spineCorrection.w);
    setGlobal(bone, leftarmQ.x, leftarmQ.y, leftarmQ.z, leftarmQ.w);
  }


  if (bone == "LeftForeArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var leftforearmQ = new THREE.Quaternion(q.y, -q.z, -q.x, q.w).normalize();

    var obj = mac2Bones["LeftArm"].global;
    var leftarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var leftarmQinverse = new THREE.Quaternion().copy(leftarmQ).invert();
    var leftarmCorrection = new THREE.Quaternion().copy(leftarmQinverse).multiply(leftforearmQ).normalize();

    x.quaternion.copy(leftarmCorrection);
    setLocal(bone, leftarmCorrection.x, leftarmCorrection.y, leftarmCorrection.z, leftarmCorrection.w);
    setGlobal(bone, leftforearmQ.x, leftforearmQ.y, leftforearmQ.z, leftforearmQ.w);
  }

  if (bone == "RightArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var rightarmQ = new THREE.Quaternion(-q.y, -q.z, q.x, q.w).normalize();

    var obj = mac2Bones["Spine"].global;
    var spineQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(rightarmQ).normalize();

    x.quaternion.copy(spineCorrection);
    setLocal(bone, spineCorrection.x, spineCorrection.y, spineCorrection.z, spineCorrection.w);
    setGlobal(bone, rightarmQ.x, rightarmQ.y, rightarmQ.z, rightarmQ.w);
  }

  if (bone == "RightForeArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var rightforearmQ = new THREE.Quaternion(-q.y, -q.z, q.x, q.w).normalize();

    var obj = mac2Bones["RightArm"].global;
    var rightarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var rightarmQinverse = new THREE.Quaternion().copy(rightarmQ).invert();
    var rightarmCorrection = new THREE.Quaternion().copy(rightarmQinverse).multiply(rightforearmQ).normalize();

    x.quaternion.copy(rightarmCorrection);
    setLocal(bone, rightarmCorrection.x, rightarmCorrection.y, rightarmCorrection.z, rightarmCorrection.w);
    setGlobal(bone, rightforearmQ.x, rightforearmQ.y, rightforearmQ.z, rightforearmQ.w);
  }

  if (bone == "LeftUpLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var leftuplegQ = new THREE.Quaternion(q.x, -q.y, -q.z, q.w).normalize();

    var obj = mac2Bones["Hips"].global;
    var hipsQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(leftuplegQ).normalize();

    x.quaternion.copy(hipsCorrection);
    setLocal(bone, hipsCorrection.x, hipsCorrection.y, hipsCorrection.z, hipsCorrection.w);
    setGlobal(bone, leftuplegQ.x, leftuplegQ.y, leftuplegQ.z, leftuplegQ.w);
  }

  if (bone == "LeftLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var leftlegQ = new THREE.Quaternion(q.x, -q.y, -q.z, q.w).normalize();


    var obj = mac2Bones["LeftUpLeg"].global;
    var leftuplegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var leftuplegQinverse = new THREE.Quaternion().copy(leftuplegQ).invert();
    var leftuplegCorrection = new THREE.Quaternion().copy(leftuplegQinverse).multiply(leftlegQ).normalize();

    x.quaternion.copy(leftuplegCorrection);
    setLocal(bone, leftuplegCorrection.x, leftuplegCorrection.y, leftuplegCorrection.z, leftuplegCorrection.w);
    setGlobal(bone, leftlegQ.x, leftlegQ.y, leftlegQ.z, leftlegQ.w);
  }

  if (bone == "RightUpLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var rightuplegQ = new THREE.Quaternion(q.x, -q.y, -q.z, q.w).normalize();

    var obj = mac2Bones["Hips"].global;
    var hipsQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(rightuplegQ).normalize();

    x.quaternion.copy(hipsCorrection);
    setLocal(bone, hipsCorrection.x, hipsCorrection.y, hipsCorrection.z, hipsCorrection.w);
    setGlobal(bone, rightuplegQ.x, rightuplegQ.y, rightuplegQ.z, rightuplegQ.w);
  }

  if (bone == "RightLeg") {

    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var rightlegQ = new THREE.Quaternion(q.x, -q.y, -q.z, q.w).normalize();

    var obj = mac2Bones["RightUpLeg"].global;
    var rightuplegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    var rightuplegQinverse = new THREE.Quaternion().copy(rightuplegQ).invert();
    var rightuplegCorrection = new THREE.Quaternion().copy(rightuplegQinverse).multiply(rightlegQ).normalize();

    x.quaternion.copy(rightuplegCorrection);
    setLocal(bone, rightuplegCorrection.x, rightuplegCorrection.y, rightuplegCorrection.z, rightuplegCorrection.w);
    setGlobal(bone, rightlegQ.x, rightlegQ.y, rightlegQ.z, rightlegQ.w);


  }

  if (bone == "Head") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion);
    //var q = new THREE.Quaternion().copy(transformedQ);
    var transformedQ = rawQuaternion.clone().multiply(refQInverse).normalize();
    var rightarmQ = new THREE.Quaternion(-q.x, -q.y, q.z, q.w).normalize();


    var spine = model.getObjectByName(rigPrefix + "Spine");
    var spineQ = new THREE.Quaternion().copy(spine.quaternion);
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(rightarmQ).normalize();

    x.quaternion.copy(spineCorrection);


  }

  if (!mac2Bones[bone]) {
    mac2Bones[bone] = {};
    mac2Bones[bone].last = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].calibration = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].local = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].global = { x: 0, y: 0, z: 0, w: 1 };
  }

  // deal with hip position


  if (obj.sensorPosition !== undefined) {
    obj.sensorPosition.x *= -1;
    if (
      initialPosition.x == 0 &&
      initialPosition.y == 0 &&
      initialPosition.z == 0
    ) {
      initialPosition.x = obj.sensorPosition.x * positionSensitivity;
      initialPosition.y = obj.sensorPosition.y * positionSensitivity;
      initialPosition.z = obj.sensorPosition.z * positionSensitivity;
    }
    if (calibrated == true) {
      initialPosition.x = obj.sensorPosition.x * positionSensitivity;
      initialPosition.y = obj.sensorPosition.y * positionSensitivity;
      initialPosition.z = obj.sensorPosition.z * positionSensitivity;
      calibrated = false;
    }

    var sensorPosition = new THREE.Vector3(
      obj.sensorPosition.x * positionSensitivity - initialPosition.x,
      obj.sensorPosition.y * positionSensitivity - initialPosition.y + 100,
      obj.sensorPosition.z * positionSensitivity - initialPosition.z
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

  var podCount = $("#deviceMapList td.connected").length;
  $("#podCount").text(podCount);



}

var lastPosition = {
  x: 0,
  y: 0,
  z: 0
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

function initInitialPosition(id, x, y, z, w) {
  mac2Bones[id].initial = { x: x, y: y, z: z, w: w };
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


function restartPods()
{
  M.Toast.dismissAll();
  M.toast({html: 'Please wear the pods and get in a T-pose for 30 seconds.<br> <button class="btn-flat toast-action green" style="margin-right:20px" onclick="M.Toast.dismissAll();restartPodsConfirm()">Continue</button>', classes: 'yellow black-text', displayLength: 10000});
}
function restartPodsConfirm(){
    $("#restartPods").prop('disabled', true);
    window.sWrite("reboot");
    M.toast({html: '<ul><li>Please get in a T-pose and  wait for <span class="secs" style="font-size:200%;font-weight:bold">30 seconds</span>.</li><li>When done the T-Pose* will be set.</li><li><sub>* You can click on "Set T-Pose" button to do this at anytime.</sub></li>', classes: 'yellow black-text', displayLength: 30*1000});
    setTimeout(function(){
     calibrate();
     $("#restartPods").prop('disabled', false);
    }, 30*1000);

    var tSec = 30;
    var p = setInterval(function(){
      var secs = document.getElementsByClassName("secs")[0] || null;
      if (secs){
        tSec--;
        if(tSec == 1){
          secs.innerHTML = tSec + " second";
        }
        else{
          secs.innerHTML = tSec + " seconds";
        }
      }
      else{
        clearInterval(p);
      }
    }, 1000);
}

function calibratein5()
{
  M.Toast.dismissAll();
  M.toast({html: 'Please wear the pods and get in a T-pose for 5 seconds.<br> <button class="btn-flat toast-action green" style="margin-right:20px" onclick="M.Toast.dismissAll();calibratein5Confirm()">Start Timer</button>', classes: 'yellow black-text', displayLength: 10000});
}

function calibratein5Confirm(){
  $("#calibratein5").prop('disabled', true);
  M.toast({html: '<ul><li>Please get in a T-pose and  wait for <span class="secs" style="font-size:200%;font-weight:bold">5 seconds</span>.</li><li>When done the T-Pose* will be set.</li><li><sub>* You can click on "Set T-Pose" button to do this at anytime.</sub></li>', classes: 'yellow black-text', displayLength: 5*1000});
  setTimeout(function(){
   calibrate();
   $("#calibratein5").prop('disabled', false);
  }, 5*1000);

  var tSec = 5;
  var p = setInterval(function(){
    var secs = document.getElementsByClassName("secs")[0] || null;
    if (secs){
      tSec--;
      if(tSec == 1){
        secs.innerHTML = tSec + " second";
      }
      else{
        secs.innerHTML = tSec + " seconds";
      }
    }
    else{
      clearInterval(p);
    }
  }, 1000);
}