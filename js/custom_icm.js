var rigPrefix = "mm";
// [HipsAlt RE-ENABLED] HipsAlt is now the orientation source for the Hips
// bone. The Hips phone provides position only (see Hips block below). An IMU
// pod flashed as bone="HipsAlt" sends rotation data; we apply it to the Hips
// bone since IMU gravity is more reliable than visual-odometry orientation.
var hipsAltLast = 0;
// var hipsLast = 0;  // still unused

var calibrated = false;
var initialPosition = { x: 0, y: 0, z: 0 };
var positionSensitivity = 100;
var hipToGroundOffset = 100; // Calculated during T-pose calibration to keep feet on ground

// Sensor mounting offset calibration - compensates for askew sensor placement
var mountingOffsets = {}; // stores per-bone mounting quaternion offsets
var mountingOffsetsCalculated = false; // flag to only calculate once

// Static T-pose anatomical offsets - compensates for sensor neutral position vs bone T-pose
// These are applied BEFORE mounting offset calculation
var tposeOffsets = {};

// [KALMAN DISABLED] kfx/kfy/kfz were declared but never referenced; keeping
// them out so the page doesn't depend on the kalmanjs CommonJS shim at all.
// If you want to re-enable position smoothing, restore these and actually
// pipe them through hipsBone.position updates.
// var kfx = new KalmanFilter({ R: 0.01, Q: 3 });
// var kfy = new KalmanFilter({ R: 0.01, Q: 3 });
// var kfz = new KalmanFilter({ R: 0.01, Q: 3 });

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

function applyMountingOffset(transformedQuaternion, bone) {
  // Apply static T-pose offset first (if exists for this bone)
  var result = transformedQuaternion.clone();
  if (tposeOffsets[bone]) {
    result.multiply(tposeOffsets[bone]);
  }

  // Then apply the mounting offset (compensates for askew sensor placement)
  if (mountingOffsets[bone]) {
    result.multiply(mountingOffsets[bone]);
  }

  return result;
}

function applySensorOffsetCompensation(quaternion, bone) {
  // Apply dynamic compensation for sensors that are physically offset from bone pivot
  // This corrects for geometric artifacts when sensor is displaced from rotation center

  if (!trees[treeType] || !trees[treeType][bone] || !trees[treeType][bone].sensorOffset) {
    return quaternion;
  }

  var offset = trees[treeType][bone].sensorOffset.position;
  if (!offset || offset.length !== 3) {
    return quaternion;
  }

  // Get compensation strength from config (default to 0.5 if not specified)
  var compensationStrength = trees[treeType][bone].sensorOffset.compensationStrength || 0.5;

  // Extract euler angles from quaternion to analyze rotation
  var euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');

  // Calculate compensation based on the sensor's offset position
  // When sensor is offset, rotations create apparent cross-axis components
  var offsetVector = new THREE.Vector3(offset[0], offset[1], offset[2]);
  var offsetLength = offsetVector.length();

  if (offsetLength < 0.01) return quaternion; // No significant offset

  // For upper legs: X rotation (forward/back) creates apparent Z rotation (outward/inward)
  // The compensation is proportional to sin(X) * offset_Z
  var xRotation = euler.x;
  var zCompensation = Math.sin(xRotation) * (offset[2] / offsetLength) * compensationStrength;

  // Apply compensation rotation
  var compensationQ = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    zCompensation
  );

  return quaternion.clone().multiply(compensationQ);
}


var flag = true;

// [BIND POSE FIX] Captured once when the first packet arrives, before any
// sensor data has perturbed the rig. calibrate() uses these as the canonical
// "expected bone orientation at T-pose" values, instead of reading
// bone.getWorldQuaternion() at calibration time (which would reflect whatever
// pose the bones happen to be in by then -- not necessarily bind pose).
var bindPoseQuaternions = {};
// [STALE POD FIX] We also need each bone's bind-pose LOCAL quaternion (i.e.
// bObj.quaternion at bind time) so we can snap a bone back to its rest pose
// when its pod disconnects. World quaternion alone is not enough -- writing
// to a bone's quaternion sets its local rotation.
var bindPoseLocalQuaternions = {};

// [STALE POD FIX] If a bone's pod stops sending packets for this long, we
// treat it as disconnected: snap the bone back to bind pose, clear its last/
// calibration/global/local state, and reset lastSeenAt to 0 so subsequent
// T-pose calibrations skip it. Without this, a dead pod's last orientation
// gets baked into the next calibration and the mannequin looks crooked
// forever -- exactly the symptom users hit when a battery dies mid-session.
var STALE_POD_MS = 2000;

function initGlobalLocalLast() {
  flag = false;

  // Initialize T-pose offsets from meta.json
  tposeOffsets = {};
  // [HipsAlt RE-ENABLED] HipsAlt is back in the bone list so its tposeOffset
  // is captured and its bind pose is snapshotted along with everything else.
  // Shoulders (15, 16) added so bind pose is captured AND mac2Bones state
  // exists when their pods join. The downstream code is null-safe -- if the
  // rig has no LeftShoulder/RightShoulder bone the snapshots silently skip
  // (see `if (bObj)` below) and the per-bone init is guarded too.
  var boneNames = ["Hips", "HipsAlt", "Spine", "Head", "LeftArm", "LeftForeArm", "LeftHand",
                   "RightArm", "RightForeArm", "RightHand", "LeftUpLeg", "LeftLeg", "LeftFoot",
                   "RightUpLeg", "RightLeg", "RightFoot",
                   "LeftShoulder", "RightShoulder"];

  // [BIND POSE FIX] Snapshot each bone's world orientation NOW, while the rig
  // is still untouched (no sensor packets have updated bones yet, since this
  // runs at the very top of the first handleWSMessage call). Save into
  // bindPoseQuaternions for calibrate() to consult later.
  for (var b = 0; b < boneNames.length; b++) {
    var bn = boneNames[b];
    var bObj = model.getObjectByName(rigPrefix + bn.replace("Alt", ""));
    if (bObj) {
      bObj.updateMatrixWorld(true);
      var bindQ = new THREE.Quaternion();
      bObj.getWorldQuaternion(bindQ);
      bindQ.normalize();
      bindPoseQuaternions[bn] = bindQ;
      // [STALE POD FIX] Snapshot the bone's LOCAL bind-pose quaternion too --
      // this is what we need to write back to bObj.quaternion to reset the
      // bone, since bone.quaternion is local-space.
      bindPoseLocalQuaternions[bn] = new THREE.Quaternion().copy(bObj.quaternion);
    }
  }

  for (var i = 0; i < boneNames.length; i++) {
    var boneName = boneNames[i];
    var boneConfig = trees[treeType] && trees[treeType][boneName];

    if (boneConfig && boneConfig.tposeOffset && boneConfig.tposeOffset.length > 0) {
      // Build composite quaternion from array of rotations
      var compositeQ = new THREE.Quaternion(0, 0, 0, 1);
      for (var j = 0; j < boneConfig.tposeOffset.length; j++) {
        var rotation = boneConfig.tposeOffset[j];
        var radians = rotation.degrees * Math.PI / 180;
        var axis = rotation.axis === 'X' ? new THREE.Vector3(1, 0, 0) :
                   rotation.axis === 'Y' ? new THREE.Vector3(0, 1, 0) :
                   new THREE.Vector3(0, 0, 1);
        var rotQ = new THREE.Quaternion().setFromAxisAngle(axis, radians);
        compositeQ.multiply(rotQ);
      }
      tposeOffsets[boneName] = compositeQ;
    } else {
      // Default to identity quaternion
      tposeOffsets[boneName] = new THREE.Quaternion(0, 0, 0, 1);
    }
  }

  var bone = model.getObjectByName(rigPrefix + "Hips");
  mac2Bones["Hips"] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
  setGlobal("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  setLocal("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  initInitialPosition("Hips", bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);

  // [HipsAlt RE-ENABLED] HipsAlt shares the Hips bone (see bone.replace("Alt","")
  // logic in handleWSMessage). It has its own mac2Bones entry for calibration
  // bookkeeping but writes orientation into mac2Bones["Hips"].global so all
  // downstream bones see a single, consistent Hips reference frame.
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

  // Shoulders are optional rig bones. If `mmLeftShoulder` / `mmRightShoulder`
  // exist on the loaded glTF, snapshot them. If not, we still create a
  // mac2Bones entry so handleWSMessage doesn't crash on `mac2Bones[bone].last`,
  // but the bone-driven slerp path will simply early-return because
  // model.getObjectByName(...) returns null in handleWSMessage too.
  ["LeftShoulder", "RightShoulder"].forEach(function (sn) {
    mac2Bones[sn] = { calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: 0, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, bcalibration: { x: 0, y: 0, z: 0, w: 1 } };
    var sb = model.getObjectByName(rigPrefix + sn);
    if (sb) {
      setGlobal(sn, sb.quaternion.x, sb.quaternion.y, sb.quaternion.z, sb.quaternion.w);
      setLocal(sn, sb.quaternion.x, sb.quaternion.y, sb.quaternion.z, sb.quaternion.w);
      initInitialPosition(sn, sb.quaternion.x, sb.quaternion.y, sb.quaternion.z, sb.quaternion.w);
    }
  });

  // [GROUND FIX] Force the model onto the ground at first-packet time, before
  // any sensor data has perturbed Hips position. Without this, hipsBone.y
  // starts at 0 from the gltf load, the Hips phone's position lerp locks Y
  // to that 0, and the feet end up rendering below Y=0 (mannequin underground).
  // Calling this here means the rig is grounded as soon as it becomes visible,
  // independent of whether the user has T-posed yet, and independent of which
  // pods are or aren't connected.
  var hipsBoneInit = model.getObjectByName(rigPrefix + "Hips");
  if (hipsBoneInit) {
    hipsBoneInit.position.set(0, 200, 0);
  }
  snapModelToGround();
}


// [STALE POD FIX] A pod is stale if it never sent a packet OR it stopped
// sending recently. Both cases must behave the same at calibration time --
// we cannot trust mac2Bones[bone].last if the pod is dead.
function isPodStale(boneName) {
  var b = mac2Bones[boneName];
  if (!b) return true;
  if (!b.lastSeenAt) return true;
  return (Date.now() - b.lastSeenAt) > STALE_POD_MS;
}

// [STALE POD FIX] Snap a bone back to its bind-pose orientation and clear all
// per-pod state, so the rig looks like the pod was never connected. Used by
// the stale watchdog and by calibrate() when a pod is missing -- prevents a
// dead pod's last frame from rendering as a crooked limb forever.
function resetBoneToBind(boneName) {
  var bObj = model.getObjectByName(rigPrefix + boneName.replace("Alt", ""));
  if (!bObj) return;

  var bindLocal = bindPoseLocalQuaternions[boneName];
  if (bindLocal) {
    bObj.quaternion.copy(bindLocal);
  }

  if (mac2Bones[boneName]) {
    mac2Bones[boneName].last = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[boneName].calibration = { x: 0, y: 0, z: 0, w: 1 };

    var bindWorld = bindPoseQuaternions[boneName];
    if (bindWorld) {
      mac2Bones[boneName].global = { x: bindWorld.x, y: bindWorld.y, z: bindWorld.z, w: bindWorld.w };
    }
    if (bindLocal) {
      mac2Bones[boneName].local = { x: bindLocal.x, y: bindLocal.y, z: bindLocal.z, w: bindLocal.w };
    } else {
      mac2Bones[boneName].local = { x: 0, y: 0, z: 0, w: 1 };
    }
    // Mark not-connected so future calibrate() skips it and our watchdog
    // doesn't keep retriggering on the same already-reset bone.
    mac2Bones[boneName].lastSeenAt = 0;
    mac2Bones[boneName].avgInterval = 0;
    mac2Bones[boneName].observedFps = 0;
  }
}

// [GROUND FIX] Force the model to scale 1, then shift it so the lowest point
// of its bounding box lands on Y=0. Idempotent and safe to call any time --
// extracted from calibrate() so other code paths (first packet, manual
// re-snap) can call it too.
function snapModelToGround() {
  if (typeof model === 'undefined' || !model) return;
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);
  var bbox = new THREE.Box3().setFromObject(model);
  if (Number.isFinite(bbox.min.y)) {
    model.position.y -= bbox.min.y;
    model.updateMatrixWorld(true);
  }
}

function calibrate() {
 // initialPosition = model.getObjectByName("mmHips").position;
  // [STALE POD FIX] Before reading any pod's `last` into calibration, snap
  // every stale pod back to bind pose. This both (a) clears the visual
  // crookedness of a dead-pod limb and (b) ensures the loop below skips
  // stale pods (their lastSeenAt was zeroed by resetBoneToBind).
  var allKeys = Object.keys(mac2Bones);
  for (var s = 0; s < allKeys.length; s++) {
    if (isPodStale(allKeys[s])) {
      resetBoneToBind(allKeys[s]);
    }
  }

  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    // Safety check - ensure entry exists and has last property
    if (!mac2Bones[keys[i]] || !mac2Bones[keys[i]].last) {
      continue;
    }

    // [STALE POD FIX] Don't bake a stale/never-connected pod's last value
    // into its calibration. resetBoneToBind() above already left calibration
    // at identity; leave it that way until the pod actually starts sending.
    if (isPodStale(keys[i])) {
      continue;
    }

    mac2Bones[keys[i]].calibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].calibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].calibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].calibration.w = mac2Bones[keys[i]].last.w;

    // AUTO-CALCULATE MOUNTING OFFSETS (only on first calibration)
    // This compensates for sensors being askew from their ideal mounting position
    // Once calculated, these offsets are preserved across T-pose resets
    if (!mountingOffsetsCalculated) {
      var bone = model.getObjectByName(rigPrefix + keys[i].replace("Alt", ""));
      if (bone && trees[treeType] && trees[treeType][keys[i]]) {
        // [BIND POSE FIX] Read expectedBoneQ from the bind-pose snapshot
        // captured at first-packet time, NOT from the current bone state.
        // Reading the live bone here was wrong: by the time calibrate() runs,
        // the bone has been driven by previous sensor packets, so its world
        // quaternion is "wherever the data put it" rather than the canonical
        // bind pose. That gave a different baseline depending on the user's
        // physical orientation at calibration moment, which then yawed the
        // entire rig (e.g. spine rendered facing right when user faced front).
        var expectedBoneQ = bindPoseQuaternions[keys[i]];
        if (!expectedBoneQ) {
          // Safety fallback if bind pose wasn't captured for some reason.
          bone.updateMatrixWorld(true);
          expectedBoneQ = new THREE.Quaternion();
          bone.getWorldQuaternion(expectedBoneQ);
          expectedBoneQ.normalize();
        }
        expectedBoneQ = expectedBoneQ.clone();

        // [CALIBRATION MATH FIX] The previous implementation used
        //   mountingOffset = expectedBoneQ * (mapped(q_cal) * tposeOffset)^-1
        // but the runtime path applies mapped(q_raw * q_cal^-1), which at
        // T-pose evaluates to mapped(identity) = identity -- not mapped(q_cal).
        // The two formulas only agree when mapped(q_cal) == identity, which
        // is exactly the empirical condition users were fighting to satisfy
        // by tweaking order/sign.
        //
        // Correct derivation:
        //   bone_at_T-pose = mapped(identity) * tposeOffset * mountingOffset
        //                  = identity * tposeOffset * mountingOffset
        //   We want this to equal expectedBoneQ (the bind-pose orientation).
        //   Therefore mountingOffset = tposeOffset^-1 * expectedBoneQ.
        //
        // This is independent of q_cal AND of the axis remap, so the bone
        // always snaps to its bind pose at T-pose regardless of pod mounting
        // or meta.json. Axis remap and tposeOffset are now responsible only
        // for translating *dynamic* rotations (delta from T-pose) into the
        // bone's local frame, not for compensating the calibration baseline.
        //
        // The bidirectional flip detection that used to live here was a
        // heuristic to compensate for the broken math. With the math correct,
        // it's no longer needed and has been removed.
        var tposeQ = tposeOffsets[keys[i]] || new THREE.Quaternion(0, 0, 0, 1);
        mountingOffsets[keys[i]] = tposeQ.clone().invert().multiply(expectedBoneQ);
      }
    }
  }

  // Mark mounting offsets as calculated after first calibration
  if (!mountingOffsetsCalculated) {
    mountingOffsetsCalculated = true;

    // Validate overall calibration quality
    var validationFailed = false;
    var badBones = [];
    var totalOffsetAngle = 0;
    var boneCount = 0;

    for (var boneName in mountingOffsets) {
      var offset = mountingOffsets[boneName];
      var angleDeg = (2 * Math.acos(Math.abs(offset.w)) * 180 / Math.PI);
      totalOffsetAngle += angleDeg;
      boneCount++;

      var threshold = 60;
      if (boneName.indexOf("Arm") !== -1 || boneName.indexOf("Hand") !== -1) {
        threshold = 90;
      }

      if (angleDeg > threshold) {
        validationFailed = true;
        badBones.push(boneName + ' (' + angleDeg.toFixed(1) + '°)');
      }
    }
  }

  // Use Y=0 as ground, hips at T-pose should be at Y=170
  var hipsBone = model.getObjectByName(rigPrefix + "Hips");

  if (hipsBone) {

      initialPosition = {
        x: lastHipsPosition.x,
        y: lastHipsPosition.y,
        z: lastHipsPosition.z 
      };


    // [GROUND FIX v3] We now do the ground snap via snapModelToGround() so
    // the same logic runs at first-packet time too (see initGlobalLocalLast).
    // Order matters: scale must be 1 before measuring bbox, and hipsBone
    // needs a sane Y so the rig isn't collapsed at the origin when measured.
    hipsBone.position.set(0, 200, 0);
    snapModelToGround();
  }
  // Reset position to origin on T-pose calibration
  calibrated = true;



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
    // Safety check - ensure entry exists and has last property
    if (!mac2Bones[keys[i]] || !mac2Bones[keys[i]].last) {
      continue;
    }

    mac2Bones[keys[i]].bcalibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].bcalibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].bcalibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].bcalibration.w = mac2Bones[keys[i]].last.w;
  }
  $("#boxCDiv").fadeIn();
  $("#calibratein5").fadeIn();
  $("#settingsButton").removeClass("animate__infinite");
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

function mapRange(value, low1, high1, low2, high2) {
  return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

// One-shot warning tracker so we don't spam the console at 32fps when a bone
// has no mapping. We want the user to SEE the issue (the old code threw and
// the throw was silently caught upstream), but we want to see it once.
var _missingMappingWarned = {};

function getTransformedQuaternion(transformedQ, bone) {
  var mapping = trees[treeType] && trees[treeType][bone];
  // Defensive: if this bone has no axis mapping for the active suite, return
  // the input unchanged and warn ONCE so the symptom is visible. Without
  // this, missing config used to crash handleWSMessage; the catch in
  // webserialnative.js then swallowed the error and the bone looked like it
  // "wasn't connected to the mapping". This is exactly the path that hid the
  // HipsAlt-on-smooth bug.
  if (!mapping || !mapping.axis || typeof mapping.axis.order !== 'string') {
    if (!_missingMappingWarned[bone]) {
      _missingMappingWarned[bone] = true;
      console.warn('[mocap] No axis mapping for bone "' + bone + '" in tree "' + treeType + '". Pass-through (identity remap). Add an entry to trees/' + treeType + '/meta.json to fix.');
    }
    return new THREE.Quaternion(transformedQ.x, transformedQ.y, transformedQ.z, transformedQ.w).normalize();
  }
  var axisOrder = mapping.axis.order.toLowerCase();
  var axisSign = mapping.axis.sign;

  var x = transformedQ[axisOrder[0]] * parseInt(axisSign[0] + 1);
  var y = transformedQ[axisOrder[1]] * parseInt(axisSign[1] + 1);
  var z = transformedQ[axisOrder[2]] * parseInt(axisSign[2] + 1);

  return new THREE.Quaternion(x, y, z, transformedQ.w).normalize();
}

// Transform position vector using posswap configuration (similar to axis mapping for orientation)
function getTransformedPosition(position, bone) {
  // Check if posswap config exists for this bone
  if (!trees[treeType] || !trees[treeType][bone] || !trees[treeType][bone].posswap) {
    // No posswap config - return original position
    return position;
  }

  var posswap = trees[treeType][bone].posswap;
  var axisOrder = posswap.order.toLowerCase();
  var axisSign = posswap.sign;

  // Create array mapping for position components
  var posArray = { x: position.x, y: position.y, z: position.z };

  // Apply axis reordering and sign flipping
  var x = posArray[axisOrder[0]] * parseInt(axisSign[0] + 1);
  var y = posArray[axisOrder[1]] * parseInt(axisSign[1] + 1);
  var z = posArray[axisOrder[2]] * parseInt(axisSign[2] + 1);

  return { x: x, y: y, z: z };
}

// [ADAPTIVE SLERP] Module-level base factor (was const inside handleWSMessage).
// Moved out so getAdaptiveSlerp() below can read it without parameter passing.
var slerpFactorBase = 0.24;

// [ADAPTIVE SLERP] Returns a per-bone slerp factor that scales up when the
// bone's observed packet rate is below DESIGN_FPS. Low-FPS pods receive a
// larger factor so each rare packet moves the bone further toward target,
// which removes the visible lag/stutter that "feels like missing frames".
//
// observedFps is updated in handleWSMessage via an EMA on packet intervals.
// Floored at 4 fps so a near-dead pod doesn't get a runaway factor.
var DESIGN_FPS = 32;
function getAdaptiveSlerp(bone) {
  var baseFactor = (slerpDict && slerpDict[bone]) || slerpFactorBase;
  var b = mac2Bones[bone];
  if (!b || !b.observedFps) return baseFactor;
  var fps = Math.max(b.observedFps, 4);
  return Math.min(1.0, baseFactor * (DESIGN_FPS / fps));
}

function handleWSMessage(obj) {

  
  if (flag) {
    initGlobalLocalLast();
  }
  var bone = obj.bone;
  var x = model.getObjectByName(rigPrefix + bone.replace("Alt", ""));

  if (!bone || !x) {
    // Visible diagnostic: the message arrived (so the wire is working) but
    // either there's no bone string (bad packet) or the rig has no matching
    // THREE.js bone (e.g. HipsAlt -> mmHips not present in this glTF).
    if (typeof window._unmappedBoneLogged === 'undefined') window._unmappedBoneLogged = {};
    var _ukey = String(bone || 'NULL');
    if (!window._unmappedBoneLogged[_ukey]) {
      window._unmappedBoneLogged[_ukey] = true;
      console.warn('[mocap] handleWSMessage dropping packet: bone="' + _ukey + '", model bone "' + (bone ? rigPrefix + bone.replace("Alt", "") : '?') + '" not found.');
    }
    return;
  }

  // One-shot success log per bone, so DevTools clearly shows the chain:
  //   "[mocap] first packet for HipsAlt -> driving mmHips"
  // Confirms binary parser, bone-id table, and rig bone resolution all line up.
  if (typeof window._firstPacketLogged === 'undefined') window._firstPacketLogged = {};
  if (!window._firstPacketLogged[bone]) {
    window._firstPacketLogged[bone] = true;
    console.log('[mocap] first packet for ' + bone + ' -> driving ' + rigPrefix + bone.replace("Alt", ""));
  }

  mac2Bones[bone].last.x = parseFloat(obj.x);
  mac2Bones[bone].last.y = parseFloat(obj.y);
  mac2Bones[bone].last.z = parseFloat(obj.z);
  mac2Bones[bone].last.w = parseFloat(obj.w);

  // [ADAPTIVE SLERP] Track per-bone observed FPS via EMA on packet intervals.
  // Used by getAdaptiveSlerp() to scale the slerp factor inversely with rate.
  var _now = Date.now();
  var _b = mac2Bones[bone];
  if (_b.lastSeenAt) {
    var _dt = _now - _b.lastSeenAt;
    if (_dt > 0) {
      _b.avgInterval = _b.avgInterval ? (_b.avgInterval * 0.9 + _dt * 0.1) : _dt;
      _b.observedFps = 1000 / _b.avgInterval;
    }
  }
  _b.lastSeenAt = _now;

  // Null-guard: a bone-id whose row hasn't been added to index.html (e.g. an
  // optional Shoulder pod on a rig that has no LeftShoulder bone listed)
  // would have no statsObjs entry, and .update() on undefined would throw.
  var _statsKey = lowerFirstLetter(bone);
  if (statsObjs[_statsKey]) statsObjs[_statsKey].update();

  var millis = parseInt(obj.millis || "-1");
  var count = parseInt(obj.count || "-1");
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

  var newBatt = parseFloat(obj.batt) * 100;
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

  // Null-guard the status row in case the bone isn't represented in the UI.
  var _statusEl = document.getElementById(lowerFirstLetter(bone) + "Status");
  if (_statusEl) {
    _statusEl.innerHTML = "<b style='margin-right:5px;font-size:16px;text-shadow:0px 0px 1px' class='green white-text chip'>ON</b>" + millText + countText + "<span class='chip' style='font-size:12px;padding:2px;line-height:26px'>" + "<i style='transform:rotate(90deg);vertical-align:middle;text-shadow:0px 0px 1px black;margin-left:0' class='material-icons " + battClass + "'>battery_full</i> " +
      newBatt + "%</span>";
    $(_statusEl).addClass("connected");
    _statusEl.dataset.last = new Date().getTime();
  }


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
  // [ADAPTIVE SLERP] local `slerpFactor` removed - now sourced via
  // getAdaptiveSlerp(bone) which falls back to the module-level slerpFactorBase.
  // const slerpFactor = .24;


  // [HIPS ORIENTATION DECOUPLED] The Hips device is a phone running visual
  // odometry, not an IMU. Its orientation reading does not return to baseline
  // even when the user physically returns to T-pose -- SLAM frame drift makes
  // the absolute quaternion unreliable as a "where is the body facing" signal.
  // Empirically (300-packet capture, 5 second test): w slid from +0.44 to
  // -0.25 across yaw+bend+return-to-rest, with no recovery on return.
  //
  // Symptom in the rig: when Hips is connected, every downstream bone's local
  // is computed as Hips.global^-1 * child.global, so a drifty Hips global
  // poisons the entire skeleton -- and turning Hips off didn't recover because
  // the LAST bad value stayed in mac2Bones["Hips"].global forever.
  //
  // Fix: keep mac2Bones["Hips"].global at its bind-pose value (set by
  // initGlobalLocalLast), so Hips contributes ONLY position to the rig.
  // Phone Hips => translation; orientation comes from no-one (bone stays bind).
  // The block below is preserved as a comment for future reference / re-enable.
  /*
  if (bone == "Hips") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var alt = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    alt = getTransformedQuaternion(alt, bone).normalize();
    alt = applyMountingOffset(alt, bone);

    var hipQ = getTransformedQuaternion(transformedQ, bone).normalize();
    hipQ = applyMountingOffset(hipQ, bone);

    x.quaternion.slerp(hipQ, getAdaptiveSlerp(bone));
    setLocal("Hips", alt.x, alt.y, alt.z, alt.w);
    setGlobal(bone, hipQ.x, hipQ.y, hipQ.z, hipQ.w);
  }
  */

  // [HipsAlt RE-ENABLED] HipsAlt drives the Hips bone's orientation. The Hips
  // phone provides translation only (Hips block above is intentionally
  // commented). When this packet arrives:
  //   - x is already the Hips THREE.js bone (bone.replace("Alt","") in
  //     handleWSMessage maps "HipsAlt" -> "mmHips")
  //   - we transform the sensor quaternion through the same axis remap +
  //     mounting offset pipeline as every other bone
  //   - we write into mac2Bones["Hips"].global, NOT ["HipsAlt"], so children
  //     (Spine, legs) read a unified Hips reference frame
  if (bone == "HipsAlt") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var hipQ = getTransformedQuaternion(transformedQ, bone).normalize();
    hipQ = applyMountingOffset(hipQ, bone);
    x.quaternion.slerp(hipQ, getAdaptiveSlerp(bone));

    setLocal("Hips", hipQ.x, hipQ.y, hipQ.z, hipQ.w);
    setGlobal("Hips", hipQ.x, hipQ.y, hipQ.z, hipQ.w);
    hipsAltLast = new Date().getTime();
  }


  if (bone == "LeftUpLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);


    var leftuplegQ = getTransformedQuaternion(transformedQ, bone);
    leftuplegQ = applyMountingOffset(leftuplegQ, bone);
    leftuplegQ = applySensorOffsetCompensation(leftuplegQ, bone);

    var obj = mac2Bones["Hips"].global;
    var hipsQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(leftuplegQ).normalize();


    x.quaternion.slerp(hipsCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, hipsCorrection.x, hipsCorrection.y, hipsCorrection.z, hipsCorrection.w);
    setGlobal(bone, leftuplegQ.x, leftuplegQ.y, leftuplegQ.z, leftuplegQ.w);
  }

  if (bone == "RightUpLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);


    var rightuplegQ = getTransformedQuaternion(transformedQ, bone);
    rightuplegQ = applyMountingOffset(rightuplegQ, bone);
    rightuplegQ = applySensorOffsetCompensation(rightuplegQ, bone);

    var obj = mac2Bones["Hips"].global;
    var hipsQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipsQinverse = new THREE.Quaternion().copy(hipsQ).invert();
    var hipsCorrection = new THREE.Quaternion().copy(hipsQinverse).multiply(rightuplegQ).normalize();


    x.quaternion.slerp(hipsCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, hipsCorrection.x, hipsCorrection.y, hipsCorrection.z, hipsCorrection.w);
    setGlobal(bone, rightuplegQ.x, rightuplegQ.y, rightuplegQ.z, rightuplegQ.w);
  }

  if (bone == "Spine") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var spineQ = getTransformedQuaternion(transformedQ, bone);
    spineQ = applyMountingOffset(spineQ, bone);

    // [HipsAlt DISABLED] HipsAlt fallback removed - always use Hips
    var parentBone = mac2Bones["Hips"];
    // if (!parentBone || !parentBone.global || (parentBone.global.x === 0 && parentBone.global.y === 0 && parentBone.global.z === 0 && parentBone.global.w === 1)) {
    //   parentBone = mac2Bones["HipsAlt"];
    // }

    var obj = parentBone.global;  // Use global instead of local to account for parent mounting offset
    var hipQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipQinverse = new THREE.Quaternion().copy(hipQ).invert();
    var hipCorrection = new THREE.Quaternion().copy(hipQinverse).multiply(spineQ).normalize();

    //x.quaternion.copy(hipCorrection);

    x.quaternion.slerp(hipCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, hipCorrection.x, hipCorrection.y, hipCorrection.z, hipCorrection.w);
    setGlobal(bone, spineQ.x, spineQ.y, spineQ.z, spineQ.w);
  }

  if (bone == "Head") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var headQ = getTransformedQuaternion(transformedQ, bone);
    headQ = applyMountingOffset(headQ, bone);

    var obj = mac2Bones["Spine"].global;
    var hipQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var hipQinverse = new THREE.Quaternion().copy(hipQ).invert();
    var hipCorrection = new THREE.Quaternion().copy(hipQinverse).multiply(headQ).normalize();

    x.quaternion.slerp(hipCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, hipCorrection.x, hipCorrection.y, hipCorrection.z, hipCorrection.w);
    setGlobal(bone, headQ.x, headQ.y, headQ.z, headQ.w);
  }

  if (bone == "LeftArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var leftarmQ = getTransformedQuaternion(transformedQ, bone);
    leftarmQ = applyMountingOffset(leftarmQ, bone);

    var obj = mac2Bones["Spine"].global;
    var spineQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(leftarmQ).normalize();

    x.quaternion.slerp(spineCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, spineCorrection.x, spineCorrection.y, spineCorrection.z, spineCorrection.w);
    setGlobal(bone, leftarmQ.x, leftarmQ.y, leftarmQ.z, leftarmQ.w);
  }

  if (bone == "RightArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var rightarmQ = getTransformedQuaternion(transformedQ, bone);
    rightarmQ = applyMountingOffset(rightarmQ, bone);
    var obj = mac2Bones["Spine"].global;
    var spineQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var spineQinverse = new THREE.Quaternion().copy(spineQ).invert();
    var spineCorrection = new THREE.Quaternion().copy(spineQinverse).multiply(rightarmQ).normalize();

    x.quaternion.slerp(spineCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, spineCorrection.x, spineCorrection.y, spineCorrection.z, spineCorrection.w);
    setGlobal(bone, rightarmQ.x, rightarmQ.y, rightarmQ.z, rightarmQ.w);
  }

  if (bone == "LeftForeArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var leftforearmQ = getTransformedQuaternion(transformedQ, bone);
    leftforearmQ = applyMountingOffset(leftforearmQ, bone);

    var obj = mac2Bones["LeftArm"].global;
    var leftarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftarmQinverse = new THREE.Quaternion().copy(leftarmQ).invert();
    var leftarmCorrection = new THREE.Quaternion().copy(leftarmQinverse).multiply(leftforearmQ).normalize();


    x.quaternion.slerp(leftarmCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, leftarmCorrection.x, leftarmCorrection.y, leftarmCorrection.z, leftarmCorrection.w);
    setGlobal(bone, leftforearmQ.x, leftforearmQ.y, leftforearmQ.z, leftforearmQ.w);
  }

  if (bone == "LeftHand") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();

    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var lefthandQ = getTransformedQuaternion(transformedQ, bone);
    lefthandQ = applyMountingOffset(lefthandQ, bone);

    var obj = mac2Bones["LeftForeArm"].global;
    var leftarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftarmQinverse = new THREE.Quaternion().copy(leftarmQ).invert();
    var lefthandCorrection = new THREE.Quaternion().copy(leftarmQinverse).multiply(lefthandQ).normalize();

    x.quaternion.slerp(lefthandCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, lefthandCorrection.x, lefthandCorrection.y, lefthandCorrection.z, lefthandCorrection.w);
    setGlobal(bone, lefthandQ.x, lefthandQ.y, lefthandQ.z, lefthandQ.w);
  }

  if (bone == "RightForeArm") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var rightforearmQ = getTransformedQuaternion(transformedQ, bone);
    rightforearmQ = applyMountingOffset(rightforearmQ, bone);

    var obj = mac2Bones["RightArm"].global;
    var rightarmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightarmQinverse = new THREE.Quaternion().copy(rightarmQ).invert();
    var rightarmCorrection = new THREE.Quaternion().copy(rightarmQinverse).multiply(rightforearmQ).normalize();

    x.quaternion.slerp(rightarmCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, rightarmCorrection.x, rightarmCorrection.y, rightarmCorrection.z, rightarmCorrection.w);
    setGlobal(bone, rightforearmQ.x, rightforearmQ.y, rightforearmQ.z, rightforearmQ.w);
  }


  if (bone == "RightHand") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var righthandQ = getTransformedQuaternion(transformedQ, bone);
    righthandQ = applyMountingOffset(righthandQ, bone);

    var obj = mac2Bones["RightForeArm"].global;
    var rightforearmQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightforearmQinverse = new THREE.Quaternion().copy(rightforearmQ).invert();
    var righthandCorrection = new THREE.Quaternion().copy(rightforearmQinverse).multiply(righthandQ).normalize();

    x.quaternion.slerp(righthandCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, righthandCorrection.x, righthandCorrection.y, righthandCorrection.z, righthandCorrection.w);
    setGlobal(bone, righthandQ.x, righthandQ.y, righthandQ.z, righthandQ.w);
  }


  if (bone == "LeftLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var leftlegQ = getTransformedQuaternion(transformedQ, bone);
    leftlegQ = applyMountingOffset(leftlegQ, bone);

    var obj = mac2Bones["LeftUpLeg"].global;
    var leftuplegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftuplegQinverse = new THREE.Quaternion().copy(leftuplegQ).invert();
    var leftuplegCorrection = new THREE.Quaternion().copy(leftuplegQinverse).multiply(leftlegQ).normalize();

    x.quaternion.slerp(leftuplegCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, leftuplegCorrection.x, leftuplegCorrection.y, leftuplegCorrection.z, leftuplegCorrection.w);
    setGlobal(bone, leftlegQ.x, leftlegQ.y, leftlegQ.z, leftlegQ.w);
  }

  if (bone == "RightLeg") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);

    var rightlegQ = getTransformedQuaternion(transformedQ, bone);
    rightlegQ = applyMountingOffset(rightlegQ, bone);

    var obj = mac2Bones["RightUpLeg"].global;
    var rightuplegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightuplegQinverse = new THREE.Quaternion().copy(rightuplegQ).invert();
    var rightuplegCorrection = new THREE.Quaternion().copy(rightuplegQinverse).multiply(rightlegQ).normalize();

    x.quaternion.slerp(rightuplegCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, rightuplegCorrection.x, rightuplegCorrection.y, rightuplegCorrection.z, rightuplegCorrection.w);
    setGlobal(bone, rightlegQ.x, rightlegQ.y, rightlegQ.z, rightlegQ.w);
  }


  if (bone == "LeftFoot") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var leftfootQ = getTransformedQuaternion(transformedQ, bone);
    leftfootQ = applyMountingOffset(leftfootQ, bone);

    var obj = mac2Bones["LeftLeg"].global;
    var leftlegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var leftlegQinverse = new THREE.Quaternion().copy(leftlegQ).invert();
    var leftlegCorrection = new THREE.Quaternion().copy(leftlegQinverse).multiply(leftfootQ).normalize();

    x.quaternion.slerp(leftlegCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, leftlegCorrection.x, leftlegCorrection.y, leftlegCorrection.z, leftlegCorrection.w);
  }

  if (bone == "RightFoot") {
    var refQInverse = new THREE.Quaternion().copy(refQuaternion).invert();
    var transformedQ = new THREE.Quaternion().multiplyQuaternions(rawQuaternion, refQInverse, bc);
    var rightfootQ = getTransformedQuaternion(transformedQ, bone);
    rightfootQ = applyMountingOffset(rightfootQ, bone);

    var obj = mac2Bones["RightLeg"].global;
    var rightlegQ = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w).normalize();
    var rightlegQinverse = new THREE.Quaternion().copy(rightlegQ).invert();
    var rightlegCorrection = new THREE.Quaternion().copy(rightlegQinverse).multiply(rightfootQ).normalize();

    x.quaternion.slerp(rightlegCorrection, getAdaptiveSlerp(bone));

    setLocal(bone, rightlegCorrection.x, rightlegCorrection.y, rightlegCorrection.z, rightlegCorrection.w);
  }

  if (!mac2Bones[bone]) {
    mac2Bones[bone] = {};
    mac2Bones[bone].last = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].calibration = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].local = { x: 0, y: 0, z: 0, w: 1 };
    mac2Bones[bone].global = { x: 0, y: 0, z: 0, w: 1 };
  }


  // Position data - only use Hips px,py,pz for positioning
  // [HipsAlt DISABLED] always use Hips posswap config
  if( bone == "Hips" && obj.px && obj.py && obj.pz ) {
        lastHipsPosition = { x: obj.px * positionSensitivity, y: obj.py * positionSensitivity, z: obj.pz * positionSensitivity };

    obj.sensorPosition = { x: obj.px, y: obj.py, z: obj.pz};

    // [HipsAlt DISABLED] always use Hips posswap (was: ternary based on hipsAltLast)
    var posswapBone = "Hips";
    // var posswapBone = (hipsAltLast + 1000 >= new Date().getTime()) ? "HipsAlt" : "Hips";

    // Apply posswap transformation to raw position data
    // This handles axis reordering and sign flipping (like tree axis mapping for orientation)
    obj.sensorPosition = getTransformedPosition(obj.sensorPosition, posswapBone);
  } else {
    // Ensure non-Hips bones don't process position data
    obj.sensorPosition = undefined;
  }


  if (bone == "Hips" && obj.sensorPosition !== undefined) {

    const hipsBone = model.getObjectByName(rigPrefix + "Hips");

    // [FLOATING FIX] IMU vertical position drifts (accelerometer integration
    // accumulates error within seconds), which made the mannequin float higher
    // and higher above the grid. We keep horizontal translation (X/Z) but lock
    // Y to whatever calibrate() set it to (170 in T-pose). This matches what
    // commercial mocap suits do: phone/IMU position is unreliable on the
    // vertical axis, so don't trust it.
    var sensorPosition = new THREE.Vector3(
      obj.sensorPosition.x * positionSensitivity - initialPosition.x,
      hipsBone.position.y, // <-- locked to current hip Y; was: obj.sensorPosition.y * positionSensitivity - initialPosition.y + hipToGroundOffset
      obj.sensorPosition.z * positionSensitivity - initialPosition.z
    );

    hipsBone.position.lerp(sensorPosition, 0.1);
  }


  var podCount = $("#deviceMapList td.connected").length;
  $(".podCount").text(podCount);


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
//  console.log(child);

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

  // Reset mounting offsets flag to allow recalculation
  mountingOffsetsCalculated = false;
  mountingOffsets = {};

  // Reset position to origin
  initialPosition = { x: 0, y: 0, z: 0 };

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
  M.toast({ html: 'Please wear the pods and get in a t-pose for 5 seconds.<br> <button class="btn-flat toast-action blue white-text" style="width:340px" onclick="M.Toast.dismissAll();calibratein5Confirm()">Start Timer</button><button class="btn-flat toast-action red white-text" style="margin-right:0" onclick="M.Toast.dismissAll();">Cancel</button>', classes: ' blue-grey lighten-4 black-text toastheader', displayLength: 1000000 });
      }
      else {
          M.toast({ html: 'Please wear the pods and get in a t-pose for 5 seconds.<br> <button class="btn-flat toast-action blue white-text" style="width:340px;margin-right:0" onclick="M.Toast.dismissAll();calibratein5Confirm()">Start Timer</button>', classes: ' blue-grey lighten-4 black-text toastheader', displayLength: 1000000 });
      }


    M.toast({ html: "<img style='width:70%;margin:auto' src='icons/t-pose.png'>", displayLength: 1000000, classes: "blue-grey lighten-4" });

}

function quickBoxCalibrate() {
  boxCalibrate();
  //M.Toast.dismissAll();
  M.toast({ html: 'Box Calibration values saved!', classes: 'blue black-text toastheader', displayLength: 50000000 });
  M.toast({ html: 'You can now wear the pods and proceed with T-Pose calibration.<img style="width:80%;display:block;margin:auto" src="icons/t-pose.png">', classes: 'blue-grey lighten-4 black-text', displayLength: 5000000 });
  $("#boxcalibratein30").remove();
  $("#boxCDiv").fadeIn();
  getBoxCalibration();
}


function skipBoxCalibrate() {
  M.toast({ html: 'Box Calibration skipped!', classes: 'red white-text toastheader', displayLength: 5000000 });
  M.toast({ html: 'You can now wear the pods and proceed with T-Pose calibration.<img style="width:80%;display:block;margin:auto" src="icons/t-pose.png">', classes: 'blue-grey lighten-4 black-text', displayLength: 5000000 });
  $("#boxcalibratein30").remove();
  $("#boxCDiv").fadeIn();
    $("#calibratein5").fadeIn();

}

function boxCalibrateIn30() {
  M.Toast.dismissAll();
  M.toast({ html: 'BOX CALIBRATION OPTIONS', classes: 'blue black-text toastheader', displayLength: 1000000 });
  M.toast({ html: '<p>Please keep all pods turned on and on the calibration plate<sup>*</sup>... </p><button class="btn-flat toast-action green white-text" style="margin:4px" onclick="M.Toast.dismissAll();boxCalibratein30Confirm()">Start</button><button class="btn-flat toast-action blue white-text" style="margin:4px" onclick="M.Toast.dismissAll();quickBoxCalibrate()">Quick</button><button class="btn-flat toast-action red white-text" style="margin:4px" onclick="M.Toast.dismissAll();skipBoxCalibrate()">Skip</button><br><small style="position:absolute;bottom:10px;line-height:14px;"><sup>*</sup>Please refer to documentation for your particular Mesquite Tree (mocap suit) for more detailed instructions.</small>', classes: 'blue-grey lighten-4 black-text paddingb', displayLength: 1000000 });

  M.toast({ html: '<iframe style="width:100%;height:70vh;border:none;display:block;margin:auto" src="./trees/bc/wearguide"></iframe>', displayLength: 1000000, classes: "toastiframe blue-grey lighten-4" });
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

    M.toast({ html: '<iframe style="width:100%;height:60vh;border:none;display:block;margin:auto" src="./trees/bc/wearguide"></iframe>', displayLength: tSec * 1000, classes: "toastiframe blue-grey lighten-4" });

  setTimeout(function () {
    boxCalibrate();
    M.Toast.dismissAll();
    M.toast({ html: 'Box Calibration done!', classes: 'green black-text toastheader', displayLength: 5000000 });
    M.toast({ html: 'You can now wear the pods and proceed with T-Pose calibration.<img style="width:80%;display:block;margin:auto" src="icons/t-pose.png">', classes: 'white black-text blue-grey lighten-4', displayLength: 5000000 });
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
  M.toast({ html: '<ul><li>Please get in a t-pose and  wait for <span class="secs" style="font-size:200%;font-weight:bold">5 seconds</span>.</li><li>When done the T-Pose* will be set.</li><img style="width:70%;display:block;margin:auto" src="icons/t-pose.png"><li><sub>* You can click on "Set T-Pose" button to do this at anytime.</sub></li>', classes: 'white black-text blue-grey lighten-4', displayLength: 5 * 1000 });
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

  // [STALE POD FIX] Treat newly-disconnected pods identically to never-
  // connected ones: snap their bone back to bind pose and clear their
  // mac2Bones state. Only act on pods that WERE connected (lastSeenAt > 0)
  // and have now gone quiet -- never-connected pods already have their bone
  // at bind pose, so there's nothing to do for them. resetBoneToBind() zeroes
  // lastSeenAt, so we won't keep reprocessing the same dead pod each tick.
  if (typeof mac2Bones !== 'undefined' && mac2Bones) {
    var staleNow = Date.now();
    var staleKeys = Object.keys(mac2Bones);
    for (var sk = 0; sk < staleKeys.length; sk++) {
      var sb = mac2Bones[staleKeys[sk]];
      if (!sb) continue;
      if (sb.lastSeenAt && (staleNow - sb.lastSeenAt) > STALE_POD_MS) {
        resetBoneToBind(staleKeys[sk]);
      }
    }
  }

  var podCount = $("#deviceMapList td.connected").length;
  $(".podCount").text(podCount);
}, 1000);

function showTreeGuide() {
  $("#overlay").fadeIn();
  $("#overlay iframe").attr("src", "./trees/" + treeType + "/wearguide");
}

function openGuide() {
  $("#overlay").fadeOut();
  window.open("./trees/" + treeType + "/wearguide", "_blank", 'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=no, resizable=no, copyhistory=no');
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
