import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;

async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
    );
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
    });
}
createFaceLandmarker();

document.getElementById("facevideo").addEventListener('play', predictFace);
let lastVideoTime = -1;






async function predictFace() {
    let results;
    const video = document.getElementById("facevideo");
    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = faceLandmarker.detectForVideo(video, startTimeMs);
    }
    if (results) {
        //console.log(results);
        const landmarks = results.faceLandmarks[0];
        if (landmarks) {
            console.log(landmarks);

            positions = new Float32Array(landmarks.length * 3);

            // get right face scatter plot positions

            // draw landmarks using faceGeometry
            var head = model.getObjectByName("mixamorigHead")
            head = head.getWorldPosition();


            for (let i = 0; i < landmarks.length; i++) {
                positions[i * 3] = (-landmarks[i].x) * 100 + head.x;
                positions[i * 3 + 1] = (-landmarks[i].y) * 100 + head.y + 90;
                positions[i * 3 + 2] = (-landmarks[i].z) * 100 + head.z;
            }












        }
    }
    window.requestAnimationFrame(predictFace);
}




import * as THREE from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/three.module.js";
import Stats from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/stats.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/OrbitControls.js";
// import { GLTFLoader } from "./build/GLTFLoader.js";
// import { KTX2Loader } from "./build/KTX2Loader.js";
// import { MeshoptDecoder } from "./build/meshopt_decoder.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/GLTFLoader.js";
 import { KTX2Loader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/KTX2Loader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/meshopt_decoder.module.js";
import { FBXLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/FBXLoader.js";
import { BVHLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/BVHLoader.js";
// import {BVHLoader} from "./build/BVHLoader.js"


const clock_bvh = new THREE.Clock();

let camera, scene, renderer, stats;

const clock = new THREE.Clock();

let mixer;



init();
animate();


$('.tabs').tabs();
// select the first tab
$('#deviceMapListB').click();
$('#ext').fadeOut(0);

/// load stats.js




var keys = Object.keys(statsObjs);
for (let i = 0; i < keys.length; i++) {
    statsObjs[keys[i]] = new Stats();
    document.getElementById(keys[i] + "Stats").appendChild(statsObjs[keys[i]].dom);
    statsObjs[keys[i]].dom.style.cssText = 'position:relative; width:80px; margin:auto';

}


// const worker = new Worker('webworker.js');

// worker.addEventListener('message', (event) => {
//     handleWSMessage(event.data);
// });

// // Connect to the WebSocket using the worker
// worker.postMessage({ type: 'connect' });

function init() {
    // init modal
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {});
    manageModal = instances[0];


    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.top = "0px";
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        2000
    );
    camera.position.set(0, 100, 600);

    scene = new THREE.Scene();
    // scene.background = new THREE.Color(0xa0a0a0);
    scene.background = new THREE.Color(0x87ceeb);
    // add transparent background

    // scene.fog = new THREE.Fog( 0xa0a0a0, 200, 1000 );
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    // add face point cloud
    faceGeometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 2, sizeAttenuation: true, color: 0xFF0000 });
    const points = new THREE.Points(faceGeometry, material);
    scene.add(points);




    // const dirLight = new THREE.DirectionalLight(0xffffff);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    //  scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

    // ground
    // const textureLoader = new THREE.TextureLoader();
    // const groundTexture = textureLoader.load('./models/TEXTURE.jpg'); // Use the path to your converted image
    // groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    // groundTexture.repeat.set(25, 25);
    // groundTexture.anisotropy = 16;
    // const occlusionMap = textureLoader.load('./models/A0.jpg');
    // const roughnessMap = textureLoader.load('./models/ROUGHNESSMAP.jpg');
    // const normalMap = textureLoader.load('./models/NORMALMAP.jpg');
    // // const heightMap = textureLoader.load('path/to/height-texture.jpg');

    // const groundMaterial = new THREE.MeshStandardMaterial({
    //     map: groundTexture,
    //     aoMap: occlusionMap,
    //     roughnessMap: roughnessMap,
    //     normalMap: normalMap,
    //     // displacementMap: heightMap,
    //     // displacementScale: 1.0, // Adjust this value to control the height effect
    // });

    const mesh = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(4000, 4000),
        new THREE.MeshStandardMaterial({ color: 0x999999, depthWrite: false })
    );
    // const mesh = new THREE.Mesh(
    //     new THREE.PlaneBufferGeometry(4000, 4000),
    //     groundMaterial
    // );


    mesh.rotation.x = - Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(4000, 80, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;

    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
    scene.add(grid);

    // model
    const loader = new FBXLoader();
    //	loader.load( 'models/fbx/Ch14_nonPBR.fbx', function ( object ) {
    loader.load("models/fbx/" + fbxfile, function (object) {
        model = object;
        model.children[1].material.color.set(0x222222);
        model.children[2].material.color.set(0x999999);

        if (zoomLevel) {
            object.scale.multiplyScalar(zoomLevel);
        }

        mixer = new THREE.AnimationMixer(object);


        object.traverse(function (child) {
            if (child.isMesh) {

                child.castShadow = true;
                child.receiveShadow = true;

            }
        });

        scene.add(object);

        var lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        var lineGeometry = new THREE.BufferGeometry();

        lineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(line_tracker), 3));
        trackingLine = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(trackingLine);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // default face 

    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('build/basis/')
        .detectSupport(renderer);



    new GLTFLoader()
        .setKTX2Loader(ktx2Loader)
        .setMeshoptDecoder(MeshoptDecoder)
        .load('./facecap.glb', (gltf) => {

            const mesh1 = gltf.scene.children[0];
            scene.add(mesh1);
            // alert(mesh1);
            var head = model.getObjectByName("mixamorigHead")
            head = head.getWorldPosition();
            // hide head color
            //
            // head.children[0].visible = false;

            //head.visible = false;

            //change head color
            // head.children[0].material.color.set(0x999999);

            mesh1.position.set(head.x, head.y+5, head.z + 8);
            mesh1.scale.set(120, 120, 140);
            mesh1.rotation.set(0, 0, 0);

            mesh1.material = new THREE.MeshStandardMaterial({ color: 0xffffff, depthWrite: false });
            mesh1.material.metalness = 0;

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 100, 0);
            controls.enableZoom = false;

            controls.update();

            window.addEventListener("resize", onWindowResize, false);

            document.getElementById("splashScreen").style.opacity = "0";
            setTimeout(function () {
                document.getElementById("splashScreen").style.display = "none";
            }, 1000);
        });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
    requestAnimationFrame(animate);


    faceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    faceGeometry.computeBoundingSphere();
    faceGeometry.computeVertexNormals();


    //		const delta = clock.getDelta();

    //			if ( mixer ) mixer.update( delta );

    renderer.render(scene, camera);

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

    scene_bvh.traverse(function (child) {
        if (child.type === "Bone") {
            if (child.name === "LeftArm") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftArm");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftForeArm") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftForeArm");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftHand") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftHand");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftUpLeg") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftUpLeg");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftLeg") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftLeg");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftFoot") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftFoot");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftShoulder") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftShoulder");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "LeftToeBase") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigLeftToeBase");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightForeArm") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightForeArm");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightArm") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightArm");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightHand") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightHand");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightUpLeg") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightUpLeg");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightLeg") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightLeg");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightFoot") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightFoot");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightShoulder") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightShoulder");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "RightToeBase") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigRightToeBase");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "Hips") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigHips");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "Head") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigHead");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "Neck") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigNeck");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else if (child.name === "Spine") {
                var q = child.quaternion;
                var bn = model.getObjectByName("mixamorigSpine");
                bn.quaternion.set(q.x, q.y, q.z, q.w);
            } else {
                // console.log(child);
            }
            renderer.render(scene, camera);

            // stats.update();
        }
    });
}

function dothistoInit() {
    rightArm = model.getObjectByName("mixamorigRightArm");
    rightArm.quaternion.set(0, 0, 0, 1);
}


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


