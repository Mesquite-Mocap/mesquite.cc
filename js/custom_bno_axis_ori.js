var rigPrefix = "mixamorig";

var calibrated = false;
var initialPosition = {x:0, y:0, z:0}
var positionSensivity = 50;

function calibrate() {
    var keys = Object.keys(mac2Bones);
    for (var i = 0; i < keys.length; i++) {
        mac2Bones[keys[i]].calibration.copy(mac2Bones[keys[i]].last);
    }
    calibrated = true;
}

function handleWSMessage(obj) {
    // console.log(mac2Bones[obj.id].id);

    var bone = mac2Bones[obj.id].id;
    var bone_THREEJS = model.getObjectByName(rigPrefix + bone);

    var currentQuaternion = new THREE.Quaternion(obj.x, obj.y, obj.z, obj.w);
    
    var localQuaternion = new THREE.Quaternion();
    var rotationQuaternion = new THREE.Quaternion();
    var euler = new THREE.Euler();

    if (bone === "Spine") {
        euler.set(0, Math.PI, 0, 'XYZ');
    } else {
        euler.set(-Math.PI / 2, 0, 0, 'XYZ');
    }

    rotationQuaternion.setFromEuler(euler);
    localQuaternion.copy(currentQuaternion).multiply(rotationQuaternion);

    // localQuaternion = currentQuaternion.multiply(rotationQuaternion);
        
    const   Bone_details = mac2Bones[obj.id];
    Bone_details.last.copy(localQuaternion);

    var calibratedQuaternion =  Bone_details.calibration.clone().invert();

    localQuaternion.multiply(calibratedQuaternion);

    var currentLocalEuler = quaternionToEuler(localQuaternion)
    var parentQuaternion = getParentQuaternion(obj.id);

    //check if obj has sensorPosition
    if (obj.sensorPosition !== undefined) {
        if (initialPosition.x == 0 && initialPosition.y == 0 && initialPosition.z == 0) {
            initialPosition.x = obj.sensorPosition.x*positionSensivity;
            initialPosition.y = obj.sensorPosition.y*positionSensivity;
            initialPosition.z = obj.sensorPosition.z*positionSensivity;
        }
        if (calibrated == true) {
            initialPosition.x = obj.sensorPosition.x*positionSensivity;
            initialPosition.y = obj.sensorPosition.y*positionSensivity;
            initialPosition.z = obj.sensorPosition.z*positionSensivity;
            calibrated = false;
        }

        var sensorPosition = new THREE.Vector3(obj.sensorPosition.x * positionSensivity - initialPosition.x, obj.sensorPosition.y * positionSensivity - initialPosition.y + 100, obj.sensorPosition.z*positionSensivity- initialPosition.z);
        //set this as position of the bone
        // console.log(sensorPosition);
        const hipsBone = model.getObjectByName(rigPrefix + "Hips");
        hipsBone.position.set(sensorPosition.z, sensorPosition.y, -sensorPosition.x);
    }

    if (parentQuaternion == null) {
        // console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
        // x.quaternion.set(localQuaternion.x, localQuaternion.z, -localQuaternion.y, localQuaternion.w);
        bone_THREEJS.quaternion.set(localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
        // setLocal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
        setGlobal(obj.id, localQuaternion.x, localQuaternion.y, localQuaternion.z, localQuaternion.w);
    } else {

        var parentEuler = quaternionToEuler(parentQuaternion);
        // console.log("currentLocalEuler " + 180 * currentLocalEuler.x / Math.PI, 180 * currentLocalEuler.y / Math.PI, 180 * currentLocalEuler.z / Math.PI);
        // console.log("parentEuler " + 180 * parentEuler.x / Math.PI, 180 * parentEuler.y / Math.PI, 180 * parentEuler.z / Math.PI);

        var newParentQuaternion = new THREE.Quaternion(parentQuaternion.x, parentQuaternion.y, parentQuaternion.z, parentQuaternion.w);
        var globalQuaternion = newParentQuaternion.invert().multiply(localQuaternion);
        // console.log("newParentQuaternion", globalQuaternion.x,globalQuaternion.y, globalQuaternion.z,globalQuaternion.w);

        // x.quaternion.set(localQuaternion.x, localQuaternion.z, -localQuaternion.y, localQuaternion.w);
        bone_THREEJS.quaternion.set(globalQuaternion.x, globalQuaternion.y, globalQuaternion.z, globalQuaternion.w);
        // setLocal(obj.id, globalQuaternion.x, globalQuaternion.y, globalQuaternion.z, globalQuaternion.w);
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

function setintial(id, x, y, z, w) {
    mac2Bones[id].initial.x = x;
    mac2Bones[id].initial.y = y;
    mac2Bones[id].initial.z = z;
    mac2Bones[id].initial.w = w;
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


function rotateQuaternion(originalQuaternion, rotationQuaternion) {
    const rotatedQuaternion = new THREE.Quaternion();
    rotatedQuaternion.multiplyQuaternions(rotationQuaternion, originalQuaternion);
    return rotatedQuaternion;
}


// function IMU_to_THREEworld(initialQuaternion) {

//     if (mac2Bones[obj.id].initial_set == false) {
//         mac2Bones[obj.id].initial.copy(currentQuaternion);
//         // var offsetQuaternion = IMU_to_THREEworld(currentQuaternion);
//         // mac2Bones[obj.id].rotation_quaternion.copy(offsetQuaternion);
//         let bone_quat = bone_THREEJS.quaternion.clone();

//         let xAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(bone_quat);
//         let yAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(bone_quat);
//         let zAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(bone_quat);
//         console.log("xAxis", xAxis, "yAxis", yAxis, "zAxis", zAxis);
//         let sensorXAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(currentQuaternion);
//         let sensorYAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(currentQuaternion);
//         let sensorZAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(currentQuaternion);

//         console.log("sensorXAxis", sensorXAxis, "sensorYAxis", sensorYAxis, "sensorZAxis", sensorZAxis);

//         let xAxisRotation = new THREE.Quaternion().setFromUnitVectors(sensorXAxis, new THREE.Vector3(1, 0, 0));
//         let yAxisRotation = new THREE.Quaternion().setFromUnitVectors(sensorYAxis, new THREE.Vector3(0, 1, 0));
//         let zAxisRotation = new THREE.Quaternion().setFromUnitVectors(sensorZAxis, new THREE.Vector3(0, 0, 1));

//         console.log("xAxisRotation", xAxisRotation, "yAxisRotation", yAxisRotation, "zAxisRotation", zAxisRotation);


//         let offsetQuaternion = xAxisRotation.multiply(yAxisRotation).multiply(zAxisRotation);
//         mac2Bones[obj.id].rotation_quaternion.copy(offsetQuaternion);

//         mac2Bones[obj.id].initial_set = true;
//         console.log("initial set");
//         console.log(mac2Bones[obj.id].initial);
//         console.log(mac2Bones[obj.id].rotation_quaternion);
//     }

//     let sensorXAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(initialQuaternion);
//     let sensorYAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(initialQuaternion);
//     let sensorZAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(initialQuaternion);

//     console.log("sensorXAxis", sensorXAxis, "sensorYAxis", sensorYAxis, "sensorZAxis", sensorZAxis);

//     let xAxisRotation = new THREE.Quaternion().setFromUnitVectors(sensorXAxis, new THREE.Vector3(1, 0, 0));
//     let yAxisRotation = new THREE.Quaternion().setFromUnitVectors(sensorYAxis, new THREE.Vector3(0, 1, 0));
//     let zAxisRotation = new THREE.Quaternion().setFromUnitVectors(sensorZAxis, new THREE.Vector3(0, 0, 1));

//     let rotationQuaternion = xAxisRotation.multiply(yAxisRotation).multiply(zAxisRotation);

//     return rotationQuaternion;
    
// }





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
    console.log(boneName);

    var podMac = select.parentNode.parentNode.parentNode.getElementsByClassName("podName")[0].innerHTML.replace("MM-", '');
    console.log(podMac);

    // mac2Bones[podMac] = { id: boneName, calibration: { x: 0, y: 0, z: 0, w: 1 }, last: { x: 0, y: 0, z: 0, w: 1 }, global: { x: null, y: 0, z: 0, w: 1 }, local: { x: 0, y: 0, z: 0, w: 1 }, sensorPosition: { x: 0, y: 0, z: 0, w: 1 } };
    // mac2Bones[podMac] = new BoneData(boneName);
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



