var rigPrefix = "mixamorig";

var calibrated = false;

function calibrate() {
    var keys = Object.keys(mac2Bones);
    for (var i = 0; i < keys.length; i++) {
        mac2Bones[keys[i]].calibration.x = mac2Bones[keys[i]].last.x;
        mac2Bones[keys[i]].calibration.y = mac2Bones[keys[i]].last.y;
        mac2Bones[keys[i]].calibration.z = mac2Bones[keys[i]].last.z;
        mac2Bones[keys[i]].calibration.w = mac2Bones[keys[i]].last.w;
    }

    calibrated = true;
}

function handleWSMessage(obj) {
    // console.log(mac2Bones[obj.id].id);

    var bone = mac2Bones[obj.id].id;
    var x = model.getObjectByName(rigPrefix + bone);

    var currentQuaternion = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);

    // const euler = new THREE.Euler(Math.PI,0, 0, 'XYZ');
    // const rotationQuaternion = new THREE.Quaternion().setFromEuler(euler);
    // var localQuaternion = rotateQuaternion(currentQuaternion, rotationQuaternion);

    var localQuaternion = currentQuaternion;

    mac2Bones[obj.id].last.x = localQuaternion.x;
    mac2Bones[obj.id].last.y = localQuaternion.y;
    mac2Bones[obj.id].last.z = localQuaternion.z;
    mac2Bones[obj.id].last.w = localQuaternion.w;

    var calibratedQuaternion = new THREE.Quaternion(
        mac2Bones[obj.id].calibration.x,
        mac2Bones[obj.id].calibration.y,
        mac2Bones[obj.id].calibration.z,
        mac2Bones[obj.id].calibration.w
    );

    localQuaternion = localQuaternion.multiply(calibratedQuaternion.invert());

    var currentLocalEuler = quaternionToEuler(localQuaternion)
    var parentQuaternion = getParentQuaternion(obj.id);

    if (parentQuaternion == null) {
        // console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
        x.quaternion.set(localQuaternion.z, localQuaternion.x, -localQuaternion.y, localQuaternion.w);
        setLocal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w)
        setGlobal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w)
    } else {
        // console.log("localQuaternion ", localQuaternion.x, localQuaternion.y , localQuaternion.z ,localQuaternion.w);
        // console.log("parentQuaternion ", parentQuaternion.x,parentQuaternion.y, parentQuaternion.z,parentQuaternion.w);

        var parentEuler = quaternionToEuler(parentQuaternion);
        console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
        console.log("parentEuler " + 180 * parentEuler.x / Math.PI, 180 * parentEuler.y / Math.PI, 180 * parentEuler.z / Math.PI);

        var newParentQuaternion = new THREE.Quaternion(parentQuaternion.x, parentQuaternion.y, parentQuaternion.z, parentQuaternion.w);
        var globalQuaternion = newParentQuaternion.invert().multiply(localQuaternion);
        // console.log("newParentQuaternion", globalQuaternion.x,globalQuaternion.y, globalQuaternion.z,globalQuaternion.w);

        x.quaternion.set(localQuaternion.z, localQuaternion.x, -localQuaternion.y, localQuaternion.w);
        setLocal(obj.id, globalQuaternion.x, globalQuaternion.y, globalQuaternion.z, globalQuaternion.w)
        setGlobal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w)
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
