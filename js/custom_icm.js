var rigPrefix = "mm";
window.sY = 0;
window.sX = 0;
window.sZ = 0;
hipsAltLast = 0;

var calibrated = false;
initialPosition = { x: 0, y: 0, z: 0 };
var positionSensitivity = 100;

// smooth position
var kfx = new KalmanFilter({ R: 0.01, Q: 3 });
var kfy = new KalmanFilter({ R: 0.01, Q: 3 });
var kfz = new KalmanFilter({ R: 0.01, Q: 3 });

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
  mac2Bones["Hips"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  
  mac2Bones["HipsAlt"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("HipsAlt", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("HipsAlt", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("HipsAlt", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  

  bone = model.getObjectByName(rigPrefix + "Spine");
  mac2Bones["Spine"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Spine", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Spine", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Spine", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "Head");
  mac2Bones["Head"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Head", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Head", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Head", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftArm");
  mac2Bones["LeftArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftForeArm");
  mac2Bones["LeftForeArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightArm");
  mac2Bones["RightArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightForeArm");
  mac2Bones["RightForeArm"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightForeArm", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftUpLeg");
  mac2Bones["LeftUpLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftLeg");
  mac2Bones["LeftLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightUpLeg");
  mac2Bones["RightUpLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightUpLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightLeg");
  mac2Bones["RightLeg"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightLeg", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftFoot");
  mac2Bones["LeftFoot"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightFoot");
  mac2Bones["RightFoot"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("RightFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("RightFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("RightFoot", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "LeftHand");
  mac2Bones["LeftHand"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("LeftHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("LeftHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("LeftHand", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  bone = model.getObjectByName(rigPrefix + "RightHand");
  mac2Bones["RightHand"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
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



  $("#calibratein5").removeClass("animate__infinite");
  $("#recordButton").fadeIn();
  facemesh.scale.set(10, 9.5, 7.7);
  model.scale.set(1, 1, 1);
  circle.scale.set(1, 1, 1);
  circle2.scale.set(1, 1, 1);

  $(".looks_3").remove();
  $("body").addClass("up");

  setTimeout(function () {
      M.Toast.dismissAll();
    M.toast({ html: "T-Pose Set!", displayLength: 5000, classes: "green toastheader" });
  M.toast({ html: "Good luck with your capture! Don't forget to record it.", displayLength: 5000, classes: "" });
  }, 500);
}


function boxCalibrate() {
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    mac2Bones[keys[i]].bcalibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].bcalibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].bcalibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].bcalibration.w = mac2Bones[keys[i]].last.w;
  }
  $("#boxCDiv").fadeIn();
  $("#calibratein5").fadeIn();
  $("#settingsButton").removeClass("animate__infinite");
 // getBoxCalibration();
}

function getBoxCalibration() {
  var ret = {};
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    ret[keys[i]] = mac2Bones[keys[i]].bcalibration;
  }
  // download the file as json
  var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(ret));
  var downloadAnchorNode = document.createElement("a");

  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "box-calibration-" + moment().format("YYYY-MM-DD-HH-mm-ss") + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click(); // auto-download
  document.body.removeChild(downloadAnchorNode); // clean up
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

function mapRange(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

function getTransformedQuaternion(transformedQ, bone) {
  var mapping = trees[treeType][bone];
  var axisOrder = mapping.axis.order.toLowerCase();
  var axisSign = mapping.axis.sign;

  var x = transformedQ[axisOrder[0]] * parseInt(axisSign[0] + 1);
  var y = transformedQ[axisOrder[1]] * parseInt(axisSign[1] + 1);
  var z = transformedQ[axisOrder[2]] * parseInt(axisSign[2] + 1);


  /*
  var q = new THREE.Quaternion(x, y, z, transformedQ.w);
  var e = new THREE.Euler().setFromQuaternion(q, "XYZ");

  if(filtersx[bone] == undefined){
    filtersx[bone] = new KalmanFilter();
  }
  x = filtersx[bone].filter(e.x);

  if(filtersy[bone] == undefined){
    filtersy[bone] = new KalmanFilter();
  }
  y = filtersy[bone].filter(e.y);

  if(filtersz[bone] == undefined){
    filtersz[bone] = new KalmanFilter();
  }
  z = filtersz[bone].filter(e.z);

  e = new THREE.Euler(x, y, z, "XYZ");

  var q2 = new THREE.Quaternion().setFromEuler(e, "XYZ");
  return q2;
  */

  return new THREE.Quaternion(x, y, z, transformedQ.w).normalize();
}

function handleWSMessage(obj) {
  //console.log(obj);
  if (flag) {
    initGlobalLocalLast();
  }
  var bone = obj.bone;
  var x = model.getObjectByName(rigPrefix + bone.replace("Alt", ""));
  // console.log(bone, x);
  if (!bone || !x) {
    return;
  }

  mac2Bones[bone].last.x = parseFloat(obj.x);
  mac2Bones[bone].last.y = parseFloat(obj.y);
  mac2Bones[bone].last.z = parseFloat(obj.z);
  mac2Bones[bone].last.w = parseFloat(obj.w);

  // console.log(obj);

  statsObjs[lowerFirstLetter(bone)].update();

  var millis = parseInt(obj.millis || "-1");
  var count = parseInt(obj.count || "-1");
  //console.log(millis, count);
  var countText = "";

  var millText = millis == -1 ? "" : "<br><span class='chip'>" + millis + "ms</span>";

  if (millis > 0) {
    var t = moment(new Date().getTime() - millis);
    let result = t.fromNow(true);

    millText = "<span class=''>for " + result + "</span>";
    millText = millText.replace("for a few seconds", "just now");
  }

  if (count > 0) {
    countText = "<br> <span class='chip' style='font-size:12px;padding:2px;line-height26px'>" + count + " <small>frames</small></span>";
  }

  /*
  var newBatt = parseFloat(obj.batt) * 100 - 80;
  newBatt *= 9;
  */
  var newBatt = parseInt(obj.batt);
  newBatt = Math.min(100, Math.max(0, newBatt)).toFixed(0);


  var battClass = "";
  if (newBatt < 20) {
    battClass = "red-text";
  } else if (newBatt < 40) {
    battClass = "orange-text";
  } else if (newBatt < 60) {
    battClass = "yellow-text";
  } else {
    battClass = "green-text";
  }

  document.getElementById(lowerFirstLetter(bone) + "Status").innerHTML = "<b style='margin-right:5px;font-size:16px;text-shadow:0px 0px 1px' class='green white-text chip'>ON</b>" + millText + countText + "<span class='chip' style='font-size:12px;padding:2px;line-height:26px'>" + "<i style='transform:rotate(90deg);vertical-align:middle;text-shadow:0px 0px 1px black;margin-left:0' class='material-icons " + battClass + "'>battery_full</i> " +
    newBatt + "%</span>";
  $("#" + lowerFirstLetter(bone) + "Status").addClass("connected");

  document.getElementById(lowerFirstLetter(bone) + "Status").dataset.last = new Date().getTime();


  var rawQuaternion = new THREE.Quaternion(parseFloat(obj.x), parseFloat(obj.y), parseFloat(obj.z), parseFloat(obj.w));

  var refQuaternion = new THREE.Quaternion(0, 0, 0, 1);
  if (mac2Bones[bone] && mac2Bones[bone].calibration) {
    refQuaternion = new THREE.Quaternion(
      mac2Bones[bone].calibration.x,
      mac2Bones[bone].calibration.y,
      mac2Bones[bone].calibration.z,
      mac2Bones[bone].calibration.w
    );
  }

  var bc = new THREE.Quaternion(mac2Bones[bone].bcalibration.x, mac2Bones[bone].bcalibration.y, mac2Bones[bone].bcalibration.z, mac2Bones[bone].bcalibration.w);
  const slerpFactor = .24; // range: 0.0 to 1.0



  if (bone == "Hips" && hipsAltLast + 1000 < new Date().getTime()) {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var alt = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    alt = getTransformedQuaternion(alt, bone).normalize();

    var hipQ = getTransformedQuaternion(transformedQ, bone).normalize();

    x.quaternion.slerp(hipQ, slerpDict[bone] || slerpFactor);

    setLocal("Hips", alt.x, alt.y, alt.z, alt.w);
    setGlobal(bone, hipQ.x, hipQ.y, hipQ.z, hipQ.w);
  }

  if (bone == "HipsAlt") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    //var alt = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);
    var alt = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    alt = getTransformedQuaternion(alt, bone).normalize();

    var hipQ = getTransformedQuaternion(transformedQ, bone).normalize();
    x.quaternion.slerp(hipQ, slerpDict[bone] || slerpFactor);

    setLocal("Hips", alt.x, alt.y, alt.z, alt.w);
    setGlobal("Hips", hipQ.x, hipQ.y, hipQ.z, hipQ.w);
    hipsAltLast = new Date().getTime();
  }


  if (bone == "LeftUpLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);


    var leftuplegQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["Hips"].global;
    var hipsQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(leftuplegQ).normalize();
    

    x.quaternion.slerp(hipsCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, hipsCorrection.x, hipsCorrection.y, hipsCorrection.z, hipsCorrection.w);
    setGlobal(bone, leftuplegQ.x, leftuplegQ.y, leftuplegQ.z, leftuplegQ.w);
  }

  if (bone == "RightUpLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    
    var rightuplegQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["Hips"].global;
    var hipsQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(rightuplegQ).normalize();


    x.quaternion.slerp(hipsCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, hipsCorrection.x, hipsCorrection.y, hipsCorrection.z, hipsCorrection.w);
    setGlobal(bone, rightuplegQ.x, rightuplegQ.y, rightuplegQ.z, rightuplegQ.w);
  }

  if (bone == "Spine") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
   // var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var spineQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["Hips"].local;
    var hipQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipQinverse = new THREE.Quaternion().copy(hipQ).invert();
    var hipCorrection = new THREE.Quaternion().copy(hipQinverse).multiply(spineQ).normalize();

    //x.quaternion.copy(hipCorrection);

    x.quaternion.slerp(hipCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, hipCorrection.x, hipCorrection.y, hipCorrection.z, hipCorrection.w);
    setGlobal(bone, spineQ.x, spineQ.y, spineQ.z, spineQ.w);
  }

  if (bone == "Head") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var headQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["Spine"].global;
    var hipQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipQinverse = new THREE.Quaternion().copy(hipQ).invert();
    var hipCorrection = new THREE.Quaternion().copy(hipQinverse).multiply(headQ).normalize();

    //(hipCorrection, bone);
    //x.rotation.set(zt[0], zt[1], zt[2]);
    //x.quaternion.copy(headQ);
    x.quaternion.slerp(hipCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, hipCorrection.x, hipCorrection.y, hipCorrection.z, hipCorrection.w);
    setGlobal(bone, headQ.x, headQ.y, headQ.z, headQ.w);
  }

  if (bone == "LeftArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var leftarmQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["Spine"].global;
    var spineQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(leftarmQ).normalize();

    x.quaternion.slerp(spineCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, spineCorrection.x, spineCorrection.y, spineCorrection.z, spineCorrection.w);
    setGlobal(bone, leftarmQ.x, leftarmQ.y, leftarmQ.z, leftarmQ.w);
  }

  if (bone == "RightArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var rightarmQ = getTransformedQuaternion(transformedQ, bone);
    var obj = mac2Bones["Spine"].global;
    var spineQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(rightarmQ).normalize();

    //var zt = smoothEuler(spineCorrection, bone);
    //x.rotation.set(zt[0], zt[1], zt[2]);
    //x.quaternion.copy(spineCorrection);
    x.quaternion.slerp(spineCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, spineCorrection.x, spineCorrection.y, spineCorrection.z, spineCorrection.w);
    setGlobal(bone, rightarmQ.x, rightarmQ.y, rightarmQ.z, rightarmQ.w);
  }

  if (bone == "LeftForeArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var leftforearmQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["LeftArm"].global;
    var leftarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftarmQinverse = new THREE.Quaternion().copy(leftarmQ).invert();
    var leftarmCorrection = new THREE.Quaternion().copy(leftarmQinverse).multiply(leftforearmQ).normalize();


    x.quaternion.slerp(leftarmCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, leftarmCorrection.x, leftarmCorrection.y, leftarmCorrection.z, leftarmCorrection.w);
    setGlobal(bone, leftforearmQ.x, leftforearmQ.y, leftforearmQ.z, leftforearmQ.w);
  }

  if (bone == "LeftHand") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var lefthandQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["LeftForeArm"].global;
    var leftarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftarmQinverse = new THREE.Quaternion().copy(leftarmQ).invert();
    var lefthandCorrection = new THREE.Quaternion().copy(leftarmQinverse).multiply(lefthandQ).normalize();

    x.quaternion.slerp(lefthandCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, lefthandCorrection.x, lefthandCorrection.y, lefthandCorrection.z, lefthandCorrection.w);
    // setGlobal(bone, leftforearmQ.x, leftforearmQ.y, leftforearmQ.z, leftforearmQ.w);
  }

  if (bone == "RightForeArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //    var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);
    var rightforearmQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["RightArm"].global;
    var rightarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightarmQinverse = new THREE.Quaternion().copy(rightarmQ).invert();
    var rightarmCorrection = new THREE.Quaternion().copy(rightarmQinverse).multiply(rightforearmQ).normalize();

    //var zt = smoothEuler(rightarmCorrection, bone);
    //x.rotation.set(zt[0], zt[1], zt[2]);
    //x.quaternion.copy(rightarmCorrection);
    x.quaternion.slerp(rightarmCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, rightarmCorrection.x, rightarmCorrection.y, rightarmCorrection.z, rightarmCorrection.w);
    setGlobal(bone, rightforearmQ.x, rightforearmQ.y, rightforearmQ.z, rightforearmQ.w);
  }


  if (bone == "RightHand") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var righthandQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["RightForeArm"].global;
    var rightforearmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightforearmQinverse = new THREE.Quaternion().copy(rightforearmQ).invert();
    var righthandCorrection = new THREE.Quaternion().copy(rightforearmQinverse).multiply(righthandQ).normalize();

   // console.log(righthandCorrection);

    x.quaternion.slerp(righthandCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, righthandCorrection.x, righthandCorrection.y, righthandCorrection.z, righthandCorrection.w);
    //setGlobal(bone, righthandQ.x, righthandQ.y, righthandQ.z, righthandQ.w);
  }





  if (bone == "LeftLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var leftlegQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["LeftUpLeg"].global;
    var leftuplegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftuplegQinverse = new THREE.Quaternion().copy(leftuplegQ).invert();
    var leftuplegCorrection = new THREE.Quaternion().copy(leftuplegQinverse).multiply(leftlegQ).normalize();

    x.quaternion.slerp(leftuplegCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, leftuplegCorrection.x, leftuplegCorrection.y, leftuplegCorrection.z, leftuplegCorrection.w);
    setGlobal(bone, leftlegQ.x, leftlegQ.y, leftlegQ.z, leftlegQ.w);
  }

  if (bone == "RightLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    //var transformedQ = new THREE.Quaternion().multiplyQuaternions(refQInverse, rawQuaternion, bc);

    var rightlegQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["RightUpLeg"].global;
    var rightuplegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightuplegQinverse = new THREE.Quaternion().copy(rightuplegQ).invert();
    var rightuplegCorrection = new THREE.Quaternion().copy(rightuplegQinverse).multiply(rightlegQ).normalize();

    x.quaternion.slerp(rightuplegCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, rightuplegCorrection.x, rightuplegCorrection.y, rightuplegCorrection.z, rightuplegCorrection.w);
    setGlobal(bone, rightlegQ.x, rightlegQ.y, rightlegQ.z, rightlegQ.w);
  }



  if (bone == "LeftFoot") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var leftfootQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["LeftLeg"].global;
    var leftlegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftlegQinverse = new THREE.Quaternion().copy(leftlegQ).invert();
    var leftlegCorrection = new THREE.Quaternion().copy(leftlegQinverse).multiply(leftfootQ).normalize();

    x.quaternion.slerp(leftlegCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, leftlegCorrection.x, leftlegCorrection.y, leftlegCorrection.z, leftlegCorrection.w);
    //setGlobal(bone, leftfootQ.x, leftfootQ.y, leftfootQ.z, leftfootQ.w);
  }

  if (bone == "RightFoot") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var rightfootQ = getTransformedQuaternion(transformedQ, bone);

    var obj = mac2Bones["RightLeg"].global;
    var rightlegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightlegQinverse = new THREE.Quaternion().copy(rightlegQ).invert();
    var rightlegCorrection = new THREE.Quaternion().copy(rightlegQinverse).multiply(rightfootQ).normalize();

    x.quaternion.slerp(rightlegCorrection, slerpDict[bone] || slerpFactor);

    setLocal(bone, rightlegCorrection.x, rightlegCorrection.y, rightlegCorrection.z, rightlegCorrection.w);
    //setGlobal(bone, rightfootQ.x, rightfootQ.y, rightfootQ.z, rightfootQ.w);
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
    
    /*
    hipsBone.position.set(
      kfx.filter(sensorPosition.x),
      kfy.filter(sensorPosition.y),
      -kfz.filter(sensorPosition.z)
    );
    */
    
   
    hipsBone.position.set(
      sensorPosition.x,
      sensorPosition.y,
      -sensorPosition.z
    );
    if(!$("body").hasClass("up")) {
      updateTrackingLine(hipsBone.position);
    }
  }



  var podCount = $("#deviceMapList td.connected").length;
  $(".podCount").text(podCount);



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


function restartPods() {
  M.Toast.dismissAll();
  M.toast({ html: 'Please wear the pods and get in a T-pose for 30 seconds.<br> <button class="btn-flat toast-action green" style="margin-right:20px" onclick="M.Toast.dismissAll();restartPodsConfirm()">Continue</button>', classes: ' blue-grey lighten-4 black-text toastheader', displayLength: 1000000 });
}
function restartPodsConfirm() {
  $("#restartPods").prop('disabled', true);
  window.sWrite("reboot");
  M.toast({ html: '<ul><li>Please get in a T-pose and  wait for <span class="secs" style="font-size:200%;font-weight:bold">30 seconds</span>.</li><li>When done the T-Pose* will be set.</li><li><sub>* You can click on "Set T-Pose" button to do this at anytime.</sub></li>', classes: 'yellow black-text', displayLength: 30 * 1000 });
  setTimeout(function () {
    calibrate();
    $("#restartPods").prop('disabled', false);
  }, 30 * 1000);

  var tSec = 30;
  var p = setInterval(function () {
    var secs = document.getElementsByClassName("secs")[0] || null;
    if (secs) {
      tSec--;
      if (tSec == 1) {
        secs.innerHTML = tSec + " second";
      }
      else {
        secs.innerHTML = tSec + " seconds";
      }
    }
    else {
      clearInterval(p);
    }
  }, 1000);
}

function calibratein5() {
  M.Toast.dismissAll();
  M.toast({ html: 'T-Pose Calibration', classes: 'green black-text toastheader', displayLength: 1000000 });
      if($("body").hasClass("up")) {
  M.toast({ html: 'Please wear the pods and get in a T-pose for 5 seconds.<br> <button class="btn-flat toast-action blue white-text" style="width:340px" onclick="M.Toast.dismissAll();calibratein5Confirm()">Start Timer</button><button class="btn-flat toast-action red white-text" style="margin-right:0" onclick="M.Toast.dismissAll();">Cancel</button>', classes: ' blue-grey lighten-4 black-text toastheader', displayLength: 1000000 });
      }
      else {
          M.toast({ html: 'Please wear the pods and get in a T-pose for 5 seconds.<br> <button class="btn-flat toast-action blue white-text" style="width:340px;margin-right:0" onclick="M.Toast.dismissAll();calibratein5Confirm()">Start Timer</button>', classes: ' blue-grey lighten-4 black-text toastheader', displayLength: 1000000 });
      }


    M.toast({ html: "<img style='width:70%;margin:auto' src='icons/t-pose.png'>", displayLength: 1000000, classes: "white" });

}

function quickBoxCalibrate() {
  boxCalibrate();
  //M.Toast.dismissAll();
  M.toast({ html: 'Box Calibration values saved!', classes: 'blue black-text toastheader', displayLength: 50000000 });
  M.toast({ html: 'You can now wear the pods and proceed with T-Pose calibration.<img style="width:80%;display:block;margin:auto" src="icons/t-pose.png">', classes: 'white black-text', displayLength: 5000000 });
  $("#boxcalibratein30").remove();
  $("#boxCDiv").fadeIn();
  getBoxCalibration();
}


function skipBoxCalibrate() {
  M.toast({ html: 'Box Calibration skipped!', classes: 'red white-text toastheader', displayLength: 5000000 });
  M.toast({ html: 'You can now wear the pods and proceed with T-Pose calibration.<img style="width:80%;display:block;margin:auto" src="icons/t-pose.png">', classes: 'white black-text', displayLength: 5000000 });
  $("#boxcalibratein30").remove();
  $("#boxCDiv").fadeIn();
    $("#calibratein5").fadeIn();
      $("#settingsButton").removeClass("animate__infinite");
     // getBoxCalibration();

}

function boxCalibrateIn30() {
  M.Toast.dismissAll();
  M.toast({ html: 'BOX CALIBRATION OPTIONS', classes: 'blue black-text toastheader', displayLength: 1000000 });
  M.toast({ html: '<p>Please keep all pods turned on and on the calibration plate<sup>*</sup>... </p><button class="btn-flat toast-action green white-text" style="margin:4px" onclick="M.Toast.dismissAll();boxCalibratein30Confirm()">Start</button><button class="btn-flat toast-action blue white-text" style="margin:4px" onclick="M.Toast.dismissAll();quickBoxCalibrate()">Quick</button><button class="btn-flat toast-action red white-text" style="margin:4px" onclick="M.Toast.dismissAll();skipBoxCalibrate()">Skip</button><br><small style="position:absolute;bottom:10px;line-height:14px;"><sup>*</sup>Please refer to documentation for your particular Mesquite Tree (mocap suit) for more detailed instructions.</small>', classes: ' blue-grey lighten-4 black-text paddingb', displayLength: 1000000 });

  M.toast({ html: '<iframe style="width:100%;height:70vh;border:none;display:block;margin:auto" src="./trees/bc/wearguide"></iframe>', displayLength: 1000000, classes: "toastiframe" });
    $("#boxcalibratein30").removeClass("animate__infinite");

}

function boxCalibratein30Confirm() {
  $("#boxcalibratein30").prop('disabled', true);
  window.sWrite("reboot");
  var tSec = 45;

    M.toast({ html: 'Box Calibration in Progress...', classes: 'red black-text toastheader', displayLength: tSec * 1000 });

  M.toast({
    html: '<ul><li>Please make sure: \
    <ol><li>all pods are turned <span class="chip green white-text" style="line-height:30px;margin-bottom:-10px;margin-top:-5px;font-size:20px;text-shadow:0px 0px 2px;font-weight:bold">ON</span> </li>\
    <li> in the box </li>\
    <li> is kept still on flat surface</li>\
    <li> is facing you</li></ol><br>\
     for <span class="secs" style="font-size:200%;font-weight:bold">45 seconds</span>.</li>', classes: ' blue-grey lighten-4 black-text', displayLength: tSec * 1000
  });

    M.toast({ html: '<iframe style="width:100%;height:60vh;border:none;display:block;margin:auto" src="./trees/bc/wearguide"></iframe>', displayLength: tSec * 1000, classes: "toastiframe" });

  setTimeout(function () {
    boxCalibrate();
    M.Toast.dismissAll();
    M.toast({ html: 'Box Calibration done!', classes: 'green black-text toastheader', displayLength: 5000000 });
    M.toast({ html: 'You can now wear the pods and proceed with T-Pose calibration.<img style="width:80%;display:block;margin:auto" src="icons/t-pose.png">', classes: 'white black-text', displayLength: 5000000 });
    $("#boxcalibratein30").remove();
    getBoxCalibration();
  }, tSec * 1000);

  var p = setInterval(function () {
    var secs = document.getElementsByClassName("secs")[0] || null;
    if (secs) {
      tSec--;
      if (tSec == 1) {
        secs.innerHTML = tSec + " second";
      }
      else {
        secs.innerHTML = tSec + " seconds";
      }
    }
    else {
      clearInterval(p);
    }
  }, 1000);
}


function calibratein5Confirm() {
  $("#calibratein5").prop('disabled', true);
    M.toast({ html: 'T-Pose Calibration in Progress...', classes: 'red black-text toastheader', displayLength: 5 * 1000 });
  M.toast({ html: '<ul><li>Please get in a T-pose and  wait for <span class="secs" style="font-size:200%;font-weight:bold">5 seconds</span>.</li><li>When done the T-Pose* will be set.</li><img style="width:70%;display:block;margin:auto" src="icons/t-pose.png"><li><sub>* You can click on "Set T-Pose" button to do this at anytime.</sub></li>', classes: 'white black-text', displayLength: 5 * 1000 });
  setTimeout(function () {
    calibrate();
    $("#calibratein5").prop('disabled', false);
  }, 5 * 1000);

  var tSec = 5;
  var p = setInterval(function () {
    var secs = document.getElementsByClassName("secs")[0] || null;
    if (secs) {
      tSec--;
      if (tSec == 1) {
        secs.innerHTML = tSec + " second";
      }
      else {
        secs.innerHTML = tSec + " seconds";
      }
    }
    else {
      clearInterval(p);
    }
  }, 1000);
}


setInterval(function () {
  $("td.connected").each(function () {
    var last = parseInt($(this).attr("data-last"));
    var now = new Date().getTime();

    if (Math.abs(now - last) > 1200) {
      $(this).removeClass("connected");
      $(this).html("<b class='red-text'>DISCONNECTED</b>");
    }
  });

  var podCount = $("#deviceMapList td.connected").length;
  $(".podCount").text(podCount);
}, 1000);

function showTreeGuide() {
  // openGuide(); return;

  $("#overlay").fadeIn();
  $("#overlay iframe").attr("src", "./trees/" + treeType + "/wearguide")
}

function openGuide() {
  $("#overlay").fadeOut();
  window.open("./trees/" + treeType + "/wearguide", "_blank", 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no')
}

function settingsOpen() {
  manageModal.open();
  $("body").addClass("settings-open");
  camera.aspect = (window.innerWidth - 400) / window.innerHeight;
  camera.updateProjectionMatrix();


  renderer.setSize(window.innerWidth - 400, window.innerHeight);
  $("#settingsButton").removeClass("animate__infinite");
}

function closeSettings() {
  manageModal.close();
  $("body").removeClass("settings-open");
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}


function smoothEuler(q, bone) {
  var ret = quaternionToEulerDegreesRad(q);
  // return ret;

  if (filtersx[bone] == undefined) {
    filtersx[bone] = new KalmanFilter();
  }
  ret[0] = filtersx[bone].filter(ret[0]);

  if (filtersy[bone] == undefined) {
    filtersy[bone] = new KalmanFilter();
  }
  ret[1] = filtersy[bone].filter(ret[1]);

  if (filtersz[bone] == undefined) {
    filtersz[bone] = new KalmanFilter();
  }
  ret[2] = filtersz[bone].filter(ret[2]);

  return ret;
}

function uploadBoxCalibration() {
  var file = document.getElementById("boxCalibrationFile").files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    var contents = e.target.result;
    //console.log(contents);
    var boxCalibration = JSON.parse(contents);
    for (var key in boxCalibration) {
      if (boxCalibration.hasOwnProperty(key)) {
        var obj = boxCalibration[key];
        var bone = key;
        var q = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
        mac2Bones[bone].bcalibration = { x: q.x, y: q.y, z: q.z, w: q.w };
      }
    }
    M.toast({ html: 'Box Calibration values uploaded!', classes: 'blue black-text', displayLength: 5000 });
  };
  reader.readAsText(file);
}