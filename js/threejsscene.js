
const blendshapesMap = {
    // '_neutral': '',
    'browDownLeft': 'browDown_L',
    'browDownRight': 'browDown_R',
    'browInnerUp': 'browInnerUp',
    'browOuterUpLeft': 'browOuterUp_L',
    'browOuterUpRight': 'browOuterUp_R',
    'cheekPuff': 'cheekPuff',
    'cheekSquintLeft': 'cheekSquint_L',
    'cheekSquintRight': 'cheekSquint_R',
    'eyeBlinkLeft': 'eyeBlink_L',
    'eyeBlinkRight': 'eyeBlink_R',
    'eyeLookDownLeft': 'eyeLookDown_L',
    'eyeLookDownRight': 'eyeLookDown_R',
    'eyeLookInLeft': 'eyeLookIn_L',
    'eyeLookInRight': 'eyeLookIn_R',
    'eyeLookOutLeft': 'eyeLookOut_L',
    'eyeLookOutRight': 'eyeLookOut_R',
    'eyeLookUpLeft': 'eyeLookUp_L',
    'eyeLookUpRight': 'eyeLookUp_R',
    'eyeSquintLeft': 'eyeSquint_L',
    'eyeSquintRight': 'eyeSquint_R',
    'eyeWideLeft': 'eyeWide_L',
    'eyeWideRight': 'eyeWide_R',
    'jawForward': 'jawForward',
    'jawLeft': 'jawLeft',
    'jawOpen': 'jawOpen',
    'jawRight': 'jawRight',
    'mouthClose': 'mouthClose',
    'mouthDimpleLeft': 'mouthDimple_L',
    'mouthDimpleRight': 'mouthDimple_R',
    'mouthFrownLeft': 'mouthFrown_L',
    'mouthFrownRight': 'mouthFrown_R',
    'mouthFunnel': 'mouthFunnel',
    'mouthLeft': 'mouthLeft',
    'mouthLowerDownLeft': 'mouthLowerDown_L',
    'mouthLowerDownRight': 'mouthLowerDown_R',
    'mouthPressLeft': 'mouthPress_L',
    'mouthPressRight': 'mouthPress_R',
    'mouthPucker': 'mouthPucker',
    'mouthRight': 'mouthRight',
    'mouthRollLower': 'mouthRollLower',
    'mouthRollUpper': 'mouthRollUpper',
    'mouthShrugLower': 'mouthShrugLower',
    'mouthShrugUpper': 'mouthShrugUpper',
    'mouthSmileLeft': 'mouthSmile_L',
    'mouthSmileRight': 'mouthSmile_R',
    'mouthStretchLeft': 'mouthStretch_L',
    'mouthStretchRight': 'mouthStretch_R',
    'mouthUpperUpLeft': 'mouthUpperUp_L',
    'mouthUpperUpRight': 'mouthUpperUp_R',
    'noseSneerLeft': 'noseSneer_L',
    'noseSneerRight': 'noseSneer_R',
    // '': 'tongueOut'
};



import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
//const { FaceLandmarker, HandLandmarker, FilesetResolver, DrawingUtils } = vision;




import {
    FilesetResolver,
    DrawingUtils,
    FaceLandmarker,
    HandLandmarker
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";


async function createFaceLandmarker() {
    var filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFaceGeometry: true,
        outputFacialTransformationMatrices: true,
        outputFaceBlendshapes: true,
        outputFaceGeometry: true,
        outputFacialTransformationMatrices: true,
        runningMode: "VIDEO",
        numFaces: 1
    });
}

async function createHandLandmarker() {
    const vision = await FilesetResolver.forVisionTasks(
        // path/to/wasm/root
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    hands = await HandLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            },
            numHands: 2
        });

    await hands.setOptions({
        runningMode: "VIDEO"
    });

}




createFaceLandmarker();
createHandLandmarker();


document.getElementById("facevideo").addEventListener('play', predictFace);
let lastVideoTime = -1;

document.getElementById("rhvideo").addEventListener('play', predictRightHand);
let lastVideoTime_rh = -1;

async function predictRightHand() {
    let results;
    const video = document.getElementById("rhvideo");
    let startTimeMs = performance.now();
    if (lastVideoTime_rh !== video.currentTime) {
        lastVideoTime_rh = video.currentTime;
        results = hands.detectForVideo(video, startTimeMs);
    }
    if (results) {
        console.log(results);
        const landmarks = results.landmarks
        if (landmarks[0]) {
            positionsR = new Float32Array(landmarks[0].length * 3);
            for (let i = 0; i < landmarks[0].length; i++) {
                positionsR[i * 3] = (-landmarks[0][i].x) * 100 - 140;
                positionsR[i * 3 + 1] = (landmarks[0][i].y) * 100 + 100;
                positionsR[i * 3 + 2] = (landmarks[0][i].z) * 100;
            }
            mapHandLandmarks(landmarks, 'Right');

        }
    }
    window.requestAnimationFrame(predictRightHand);
}



function mapHandLandmarks(landmarks, hand) {
    var x = calculateAngle(landmarks[0][6], landmarks[0][7], landmarks[0][8]);
    var index3 = model.getObjectByName("mm" + hand + "HandIndex3");
    index3.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][5], landmarks[0][6], landmarks[0][7]);
    var index2 = model.getObjectByName("mm" + hand + "HandIndex2");
    index2.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][0], landmarks[0][5], landmarks[0][6]);
    var index1 = model.getObjectByName("mm" + hand + "HandIndex1");
    index1.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][10], landmarks[0][11], landmarks[0][12]);
    var middle3 = model.getObjectByName("mm" + hand + "HandMiddle3");
    middle3.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][9], landmarks[0][10], landmarks[0][11]);
    var middle2 = model.getObjectByName("mm" + hand + "HandMiddle2");
    middle2.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][0], landmarks[0][9], landmarks[0][10]);
    var middle1 = model.getObjectByName("mm" + hand + "HandMiddle1");
    middle1.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][14], landmarks[0][15], landmarks[0][16]);
    var ring3 = model.getObjectByName("mm" + hand + "HandRing3");
    ring3.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][13], landmarks[0][14], landmarks[0][15]);
    var ring2 = model.getObjectByName("mm" + hand + "HandRing2");
    ring2.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][0], landmarks[0][13], landmarks[0][14]);
    var ring1 = model.getObjectByName("mm" + hand + "HandRing1");
    ring1.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][18], landmarks[0][19], landmarks[0][20]);
    var pinky3 = model.getObjectByName("mm" + hand + "HandPinky3");
    pinky3.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][17], landmarks[0][18], landmarks[0][19]);
    var pinky2 = model.getObjectByName("mm" + hand + "HandPinky2");
    pinky2.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][0], landmarks[0][17], landmarks[0][18]);
    var pinky1 = model.getObjectByName("mm" + hand + "HandPinky1");
    pinky1.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][2], landmarks[0][3], landmarks[0][4]);
    var thumb3 = model.getObjectByName("mm" + hand + "HandThumb3");
    thumb3.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][1], landmarks[0][2], landmarks[0][3]);
    var thumb2 = model.getObjectByName("mm" + hand + "HandThumb2");
    thumb2.rotation.set(0, 0, x * Math.PI / 180, "XYZ");

    x = calculateAngle(landmarks[0][5], landmarks[0][0], landmarks[0][1]);
    var thumb1 = model.getObjectByName("mm" + hand + "HandThumb1");
    thumb1.rotation.set(0, -x * Math.PI / 180, 0, "XYZ");





}

async function predictFace() {
    let results;
    const video = document.getElementById("facevideo");
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = faceLandmarker.detectForVideo(video, startTimeMs);
    }
    if (results) {
        faceResults = results;
        if (results.faceBlendshapes.length > 0) {
            //console.log(results.faceBlendshapes[0].categories);
            const face = scene.getObjectByName('mesh_2');
            const faceBlendshapes = results.faceBlendshapes[0].categories;
            for (const blendshape of faceBlendshapes) {
                const categoryName = blendshape.categoryName;
                const score = blendshape.score;
                const index = face.morphTargetDictionary[blendshapesMap[categoryName]];
                //console.log(index, categoryName, score);
                if (index !== undefined) {
                    face.morphTargetInfluences[index] = score;
                }
            }
            renderer.render(scene, camera);
        }
    }
    window.requestAnimationFrame(predictFace);
}




function calculateAngle(landmarkA, landmarkB, landmarkC) {
    const vectorAB = { x: landmarkB.x - landmarkA.x, y: landmarkB.y - landmarkA.y, z: landmarkB.z - landmarkA.z };
    const vectorBC = { x: landmarkC.x - landmarkB.x, y: landmarkC.y - landmarkB.y, z: landmarkC.z - landmarkB.z };

    const dotProduct = vectorAB.x * vectorBC.x + vectorAB.y * vectorBC.y + vectorAB.z * vectorBC.z;
    const magnitudeAB = Math.sqrt(vectorAB.x ** 2 + vectorAB.y ** 2 + vectorAB.z ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2 + vectorBC.z ** 2);

    const angle = Math.acos(dotProduct / (magnitudeAB * magnitudeBC));
    return angle * (180 / Math.PI); // Convert from radians to degrees
}



import * as THREE from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/three.module.js";
import Stats from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/stats.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/OrbitControls.js";
// import { GLTFLoader } from "./build/GLTFLoader.js";
// import { KTX2Loader } from "./build/KTX2Loader.js";
// import { MeshoptDecoder } from "./build/meshopt_decoder.module.js";
// import {BVHLoader} from "./build/BVHLoader.js"
import { GLTFLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/GLTFLoader.js";
import { KTX2Loader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/KTX2Loader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/meshopt_decoder.module.js";
import { BVHLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/BVHLoader.js";
import { CCDIKSolver } from 'https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/CCDIKSolver.js';
import { ViewportGizmo } from 'https://cdn.jsdelivr.net/npm/three-viewport-gizmo@0.1.5/+esm'
//import { SkinnedMesh } from "three/src/Three.js";

class InfiniteGridHelper extends THREE.GridHelper {
    constructor(size1, size2, color1, color2) {
        super(size1, size2, color1, color2);
        this.material.depthWrite = false;
        this.frustumCulled = false;
    }

    update(camera) {
        const gridPosition = new THREE.Vector3();
        gridPosition.copy(camera.position);
        gridPosition.y = 0;
        this.position.copy(gridPosition);
    }
}

const clock_bvh = new THREE.Clock();
const clock = new THREE.Clock();

let mixer;



init();
animate();


$('.tabs').tabs();
// select the first tab
$('#deviceMapListB').click();
$('#ext').fadeOut(0);





var keys = Object.keys(statsObjs);
for (let i = 0; i < keys.length; i++) {
    statsObjs[keys[i]] = new Stats();
    document.getElementById(keys[i] + "Stats").appendChild(statsObjs[keys[i]].dom);
    statsObjs[keys[i]].dom.style.cssText = 'position:relative; width:80px; margin:auto';

}




function init() {
    // init modal
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {onCloseStart: function () {
        if (manageModal) {
            closeSettings();
        }
    }});
    manageModal = instances[0];


    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0px";
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        15000
    );
    camera.position.set(0, 100, 600);


    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0xa0a0a0);
    // scene.background = new THREE.Color(0x111111);
    // add transparent background
    scene.background = null;

    // scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );




    // add face point cloud
    faceGeometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 2, sizeAttenuation: true, color: 0xFF0000 });
    const points = new THREE.Points(faceGeometry, material);
    scene.add(points);

    // add hand point cloud
    leftHandGeometry = new THREE.BufferGeometry();
    const material2 = new THREE.PointsMaterial({ size: 12, sizeAttenuation: true, color: 0x0000FF });
    const points2 = new THREE.Points(leftHandGeometry, material2);
    scene.add(points2);

    rightHandGeometry = new THREE.BufferGeometry();
    const material3 = new THREE.PointsMaterial({ size: 4, sizeAttenuation: true, color: 0xFFFF00 });
    const points3 = new THREE.Points(rightHandGeometry, material3);
    scene.add(points3);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    window.grid = new InfiniteGridHelper(14000, 180, 0x232323, 0x454545);
    window.grid.material.opacity = 0.7;
    window.grid.material.transparent = false;
    scene.add(window.grid);



    // mesh floor
    const floorGeometry = new THREE.PlaneGeometry(14000, 14000);
    const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = - Math.PI / 2;
    floor.position.y = - 0.5;
    floor.receiveShadow = true;
    // color
    floorMaterial.color.set(0xffffff);
    scene.add(floor);



    const circleGeometry = new THREE.CircleGeometry(9, 32);


    const circleMaterial = new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = - Math.PI / 2;
    circle.position.y = .5;
    circle.position.z = 5;
    circle.scale.set(.0001, .0001, .0001);

    scene.add(circle);

    // white circle border
    const circleGeometry2 = new THREE.CircleGeometry(10, 32);
    const circleMaterial2 = new THREE.MeshBasicMaterial({ color: 0x343434, side: THREE.DoubleSide });
    circle2 = new THREE.Mesh(circleGeometry2, circleMaterial2);
    circle2.rotation.x = - Math.PI / 2;
    circle2.position.y = .4;
    circle2.position.z = 5;
    circle2.scale.set(.0001, .0001, .0001);
    scene.add(circle2);

    var glbLoader = new GLTFLoader();
    glbLoader.load("./glbs/scene2.glb", function (object) {
        model = object.scene;
        model.children[0].children[1].material.color.set(0x7d7d7d);
        model.children[0].children[2].material.color.set(0x121212);

        // make material shine
        model.children[0].children[1].material.metalness = 1;
        model.children[0].children[1].material.roughness = 0.5;

        model.scale.set(.00001, .00001, .00001);


        mixer = new THREE.AnimationMixer(object);
        // console.log(mixer);

        model.traverse(function (child) {
            // console.log(child);
            if (child.isSkinnedMesh) {
                skinnedMesh = child;
                let iks = [];
                ikSolver = new CCDIKSolver(skinnedMesh, {
                    name: "CCDIK",
                    iterations: 10,
                    minAngle: 0.01,
                    maxAngle: 1.5,
                    minDistance: 0.01,
                    maxDistance: 1.5
                });

            }
            if (child.name === "mmHead") {
                child.traverse(function (child1) {
                    child1.scale.set(.9, .85, .67);
                    // if(child1.material.map) child1.material.map.anisotropy = 1;

                });

            }
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

            }
            //console.log(child.name);
        });


        scene.add(model);

        var lineMaterial = new THREE.LineBasicMaterial({ color: 0xffeb3b });
        var lineGeometry = new THREE.BufferGeometry();

        lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(line_tracker), 3));
        trackingLine = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(trackingLine);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);


    // default face 

    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('build/basis/')
        .detectSupport(renderer);



    new GLTFLoader()
        .setKTX2Loader(ktx2Loader)
        .setMeshoptDecoder(MeshoptDecoder)
        //.load('./facecap.glb', (gltf) => {
        .load('./glbs/scene.glb', (gltf) => {
            facemesh = gltf.scene.children[0];
            facemesh.castShadow = false;
            facemesh.receiveShadow = false;
            scene.add(facemesh);



            facemesh.scale.set(.0001, .0001, .0001);

            facemesh.rotation.set(0, 0, 0);

            facemesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff, depthWrite: false });
            facemesh.material.metalness = 1;
            facemesh.material.roughness = 5;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 150, 0);
            controls.enableZoom = true;
            controls.minDistance = 100;
            controls.maxDistance = 3800;

            controls.update();

            /*
                        viewportGizmo = new ViewportGizmo(camera, renderer, {
                            placement: 'top-center'
                        });
                        viewportGizmo.target = controls.target;
                
                        // listeners
                        viewportGizmo.addEventListener("start", () => (controls.enabled = false));
                        viewportGizmo.addEventListener("end", () => (controls.enabled = true));
                    
                        controls.addEventListener("change", () => {
                            viewportGizmo.update();
                        });
                        */


            M.toast({ html: "Welcome to MESQUITE.cc !", displayLength: 500000, classes: "green toastheader" });
            M.toast({ html: "<p style='margin-right:20px;margin-top:0;margin-bottom:auto'>Plug in and LINK DONGLE to continue.</p><img style='height:80vh;margin-bottom:-40px' src='icons/dongle.gif'>", displayLength: 500000, classes: "" });
            document.getElementById("splashScreen").style.transition = "opacity 2s";

            document.getElementById("splashScreen").style.opacity = "0";
            setTimeout(function () {
                document.getElementById("splashScreen").style.display = "none";
            }, 1200);
        });

}


function debounce(func, time) {
    var time = time || 100; // 100 by default if no param
    var timer;
    return function (event) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(func, time, event);
    };
}

// Eventlistener
//window.addEventListener("resize", debounce( onWindowResize, 150 ));
window.addEventListener("resize", onWindowResize);

function onWindowResize() {
    var x = 0;
    if ($("body").hasClass("settings-open")) x = 420;
    camera.aspect = (window.innerWidth - x) / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth - x, window.innerHeight);
}

//

function animate() {


    requestAnimationFrame(animate);




    if (model) {
        var head = model.getObjectByName("mmHead");
        if (head && facemesh) {
            // console.log(facemesh);
            head.getWorldPosition(facemesh.position);
            head.getWorldQuaternion(facemesh.quaternion);

            // facemesh.position.y += 6;
            //  facemesh.position.z += 0;
            //  facemesh.position.x += 0;

        }
    }


    if (faceResults && faceResults.faceBlendshapes && faceResults.faceBlendshapes.length > 0) {

        const face = scene.getObjectByName('mesh_2');
        // console.log(faceResults.faceBlendshapes[0].categories);

        const faceBlendshapes = faceResults.faceBlendshapes[0].categories;

        for (const blendshape of faceBlendshapes) {

            const categoryName = blendshape.categoryName;
            const score = blendshape.score;

            const index = face.morphTargetDictionary[blendshapesMap[categoryName]];

            if (index !== undefined) {

                face.morphTargetInfluences[index] = score;

            }

        }

    }


    //faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    //faceGeometry.computeBoundingSphere();
    //faceGeometry.computeVertexNormals();

    leftHandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsL, 3).setUsage(THREE.DynamicDrawUsage));
    leftHandGeometry.computeBoundingSphere();
    leftHandGeometry.computeVertexNormals();

    rightHandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positionsR, 3).setUsage(THREE.DynamicDrawUsage));
    rightHandGeometry.computeBoundingSphere();
    rightHandGeometry.computeVertexNormals();







    //grid.update(camera);

    if(ikSolver) {
        ikSolver.update();
    }

    renderer.render(scene, camera);

    if (viewportGizmo)
        viewportGizmo.render();

    // stats.update();
}
function init_bvh() {
    // camera_bvh = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 1000 );
    // camera_bvh.position.set( 0, 200, 300 );

    scene_bvh = new THREE.Scene();

    //  setTimeout("dothistoInit()",0)
}

function animate_bvh() {
    requestAnimationFrame(animate_bvh);

    const delta = clock_bvh.getDelta();


    if (mixer_bvh) {
        mixer_bvh.update(delta);
        // console.log(mixer_bvh.time);
        if (mixer_bvh.time >= animationDuration) {
            animation.paused = true;
            animation.time = animationDuration;
        }
    }

}

function dothistoInit() {
    rightArm = model.getObjectByName("mmRightArm");
    rightArm.quaternion.set(0, 0, 0, 1);
}

/*
document.getElementById("bvhFileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const bvhData = e.target.result;
        loadAndPlayBVH(bvhData);
    };
    reader.readAsText(file);
});
*/

function loadAndPlayBVH(bvhData) {
    // console.log(bvhData);
    init_bvh();
    animate_bvh();
    const loader_bvh = new BVHLoader();
    // console.log(loader_bvh.parse);

    const result = loader_bvh.parse(bvhData);
    animationDuration = result.clip.duration;
    // console.log(animationDuration);

    skeletonHelper_bvh = new THREE.SkeletonHelper(result.skeleton.bones[0]);
    skeletonHelper_bvh.skeleton = result.skeleton;

    const boneContainer = new THREE.Group();
    boneContainer.add(result.skeleton.bones[0]);

    // scene.add(skeletonHelper_bvh);
    // scene.add(boneContainer);
    scene_bvh.add(skeletonHelper_bvh);
    scene_bvh.add(boneContainer);

    mixer_bvh = new THREE.AnimationMixer(skeletonHelper_bvh);
    animation = mixer_bvh.clipAction(result.clip);
    animation.setEffectiveWeight(1.0);
    // console.log(animation);
    animation.play();
}
