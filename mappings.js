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

 var mac2Bones = {};


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