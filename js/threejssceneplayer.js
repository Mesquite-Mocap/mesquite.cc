// import * as THREE from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/three.module.js";
import Stats from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/stats.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/GLTFLoader.js";
//import { BVHLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/BVHLoader.js";
 import {BVHLoader} from "../build-static/BVHLoader.js"
import * as THREE from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/three.module.js";

const clock_bvh = new THREE.Clock();

let camera, scene, renderer, stats;

const clock = new THREE.Clock();

let mixer;

init();
animate();

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
        new THREE.PlaneGeometry(4000, 4000),
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

    var glbLoader = new GLTFLoader();
    glbLoader.load("./glbs/scene2.glb", function (object) {
        model = object.scene;
        model.children[0].children[1].material.color.set(0x7d7d7d);
        model.children[0].children[2].material.color.set(0x121212);

        // make material shine
        model.children[0].children[1].material.metalness = 1;
        model.children[0].children[1].material.roughness = 0.5;

        if (zoomLevel) {
            object.scale.multiplyScalar(zoomLevel);
        }

        mixer = new THREE.AnimationMixer(object);
        // console.log(mixer);
        
        model.traverse(function (child) {
            // console.log(child);
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

        var lineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff });
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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.enableZoom = false;

    controls.update();

    window.addEventListener("resize", onWindowResize, false);

    document.getElementById("splashScreen").style.opacity = "0";
    setTimeout(function () {
        document.getElementById("splashScreen").style.display = "none";
    }, 1000);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

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