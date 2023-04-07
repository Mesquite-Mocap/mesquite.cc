var rigPrefix = "mixamorig";
var velocityArray = []
var dist = [0, 0, 0]
var mov = []
const freq = 0.015
var counter=0
var u = [0,0,0]

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
  // console.log(mac2Bones[obj.id].id);
  mac2Bones[obj.id].last.x = obj.x;
  mac2Bones[obj.id].last.y = obj.y;
  mac2Bones[obj.id].last.z = obj.z;
  mac2Bones[obj.id].last.w = obj.w;
  var bone = mac2Bones[obj.id].id;
  var x = model.getObjectByName(rigPrefix + bone);

  var mpuQ = new THREE.Quaternion(obj.w, obj.x, obj.y, obj.z);
  var bnoQ = mpuToBnoFrame(mpuQ);

  var q = new Quaternion(bnoQ.x, bnoQ.y, bnoQ.z, bnoQ.w);
  
  var qC = new Quaternion(
    mac2Bones[obj.id].calibration.x,
    mac2Bones[obj.id].calibration.y,
    mac2Bones[obj.id].calibration.z,
    mac2Bones[obj.id].calibration.w
  );

  var qR = q.mul(qC.inverse());

  var e = qte(qR)
  var e1 = getParentQuat(obj.id);

  if(e1 == null) {
    x.quaternion.set(qR.z, qR.x, -qR.y, qR.w);
    setLocal(obj.id, qR.x, qR.y, qR.z, qR.w)
    setGlobal(obj.id, qR.x, qR.y, qR.z, qR.w)
  } else {
    // console.log("e", qR.x, qR.y , qR.z ,qR.w);
    // console.log("e1", e1.x,e1.y, e1.z,e1.w);

    var ep = qte(e1);
    // console.log("e " + 180 * e.x / Math.PI, 180 * e.y / Math.PI, 180 * e.z / Math.PI);
    // console.log("e1 " + 180 * ep.x / Math.PI, 180 * ep.y / Math.PI, 180 * ep.z / Math.PI);

    var e1q = new Quaternion(e1.w, e1.x, e1.y, e1.z);
    var qR1 = qR.mul(e1q.inverse());
    // console.log("e1q", qR1.x,qR1.y, qR1.z,qR1.w);

    x.quaternion.set(qR1.z, qR1.x, -qR1.y, qR1.w);
    setLocal(obj.id, qR1.x, qR1.y, qR1.z, qR1.w)
    setGlobal(obj.id, qR.x, qR.y, qR.z, qR.w)
  }
}

function qte(q) {
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

function getParentQuat(child) {
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

function getMovementValue(a, b) {
  return a*freq;
}

function mpuToBnoFrame(q) {
  // Define the initial and final axes of the coordinate system
  const initialX = new THREE.Vector3(-1, 0, 0); // Points to the left
  const initialY = new THREE.Vector3(0, -1, 0); // Points downwards
  const initialZ = new THREE.Vector3(0, 0, 1); // Points forwards
  const finalX = new THREE.Vector3(1, 0, 0); // Points to the right
  const finalY = new THREE.Vector3(0, 1, 0); // Points backwards
  const finalZ = new THREE.Vector3(0, 0, -1); // Points downwards

  // Define the quaternion representing the rotation from initial to final orientation
  const rotationQuaternion = new THREE.Quaternion().setFromUnitVectors(initialX, finalX);
  rotationQuaternion.multiply(new THREE.Quaternion().setFromUnitVectors(initialY, finalY));
  rotationQuaternion.multiply(new THREE.Quaternion().setFromUnitVectors(initialZ, finalZ));

  // Multiply the two quaternions to obtain the final orientation
  const finalQuaternion = q.clone().multiply(rotationQuaternion);

  return finalQuaternion;

}

function mapPods(){
  //open modal
  manageModal.open();

}