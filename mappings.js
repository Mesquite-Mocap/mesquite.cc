class BoneData {
    constructor(boneName) {
        this.id = boneName;
        this.calibration = new THREE.Quaternion(0, 0, 0, 1);
        this.last = new THREE.Quaternion(0, 0, 0, 1);
        this.global = new THREE.Quaternion(0, 0, 0, 1);
        this.initial = new THREE.Quaternion(0, 0, 0, 1);
        this.rotation_quaternion = new THREE.Quaternion(0, 0, 0, 1);
        this.sensorPosition = new THREE.Vector4(0, 0, 0, 1);
        this.initial_set = false;
    }
}

// var mac2Bones = {};

var mac2Bones = {
  "08:3a:f2:44:c8:de" : {id: "LeftArm", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:c8:36" : {id: "LeftForeArm", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "4c:75:25:c0:23:de" : {id: "LeftHand", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:cb:6e" : {id: "LeftUpLeg", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:c9:8a" : {id: "LeftLeg", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "4c:75:25:c0:sad:f2" : {id: "LeftFoot", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "00:00:00:00:00:06" : {id: "LeftShoulder", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "00:00:00:00:00:07" : {id: "LeftToeBase", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:c9:ba" : {id: "RightForeArm", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:cb:1e" : {id: "RightArm", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "08:3A:F2:44:CB:26" : {id: "RightHand", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:ca:92" : {id: "RightUpLeg", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:cb:6a" : {id: "RightLeg", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "00:00:00:00:00:13" : {id: "RightFoot", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "00:00:00:00:00:14" : {id: "RightShoulder", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "4c:75:25:c0:23:hh" : {id: "RightToeBase", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:ca:9a" : {id: "Hips", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3a:f2:44:ca:8e" : {id: "Head", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
//   "00:00:00:00:00:18" : {id: "Neck", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}},
  "08:3A:F2:44:C9:B8" : {id: "Spine", calibration:{x:0, y:0, z:0, w:1}, last:{x:0, y:0, z:0, w:1}, global:{x:null, y:0, z:0, w:1}, local:{x:0, y:0, z:0, w:1}, sensorPosition:{x:0, y:0, z:0, w: 1}}
}

// core skeleton
// mac2Bones["08:3a:f2:44:ca:9a"] = new BoneData("Hips");
// mac2Bones["08:3a:f2:44:ca:8e"] = new BoneData("Head");

// mac2Bones["4c:75:25:c0:23:ff"] = new BoneData("Spine");

// // left arm
// mac2Bones["08:3a:f2:44:c8:de"] = new BoneData("LeftArm");
// mac2Bones["08:3a:f2:44:c8:36"] = new BoneData("LeftForeArm");

// // left leg
// mac2Bones["08:3a:f2:44:cb:6e"] = new BoneData("LeftUpLeg");
// mac2Bones["08:3a:f2:44:c9:8a"] = new BoneData("LeftLeg");

// // right arm
// mac2Bones["08:3a:f2:44:c9:ba"] = new BoneData("RightForeArm");
// mac2Bones["08:3a:f2:44:cb:1e"] = new BoneData("RightArm");

// // right leg
// mac2Bones["08:3a:f2:44:ca:92"] = new BoneData("RightUpLeg");
// mac2Bones["08:3a:f2:44:cb:6a"] = new BoneData("RightLeg");


var dependencyGraph = {
    "Spine": "Hips",
    "Head": "Spine",
    "RightUpLeg": "Hips",
    "LeftUpLeg": "Hips",
    "LeftArm": "Spine",
    "RightArm": "Spine",
    "RightForeArm": "RightArm",
    "LeftForeArm": "LeftArm",
    "RightLeg": "RightUpLeg",
    "LeftLeg": "LeftUpLeg",
    "LeftHand": "LeftForeArm",
    "RightHand": "RightForeArm"
}





// var dependencyGraph = {
//   "LeftForeArm" : "LeftArm",
//   "RightForeArm": "RightArm",
//   "LeftArm": "Spine",
//   "RightUpLeg": "Hips",
//   "LeftUpLeg": "Hips",
//   "RightArm": "Spine",
//   "Head": "Spine",
//   "Spine": "Hips",
// }