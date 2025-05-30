import * as THREE from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/three.module.js";
import Stats from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/stats.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/GLTFLoader.js";
import { KTX2Loader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc/build/KTX2Loader.js";
import { MeshoptDecoder } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build/meshopt_decoder.module.js";
import { BVHLoader } from "https://cdn.jsdelivr.net/gh/mesquite-mocap/mesquite.cc@latest/build-static/BVHLoader.js";
import { ViewportGizmo } from 'https://cdn.jsdelivr.net/npm/three-viewport-gizmo@0.1.5/+esm'

const clock_bvh = new THREE.Clock();
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
        15000
    );
    camera.position.set(0, 180, 400);


    scene = new THREE.Scene();
     scene.background = new THREE.Color(0xffffff);


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






    var glbLoader = new GLTFLoader();
    glbLoader.load("./glbs/scene2.glb", function (object) {
        model = object.scene;
        model.children[0].children[1].material.color.set(0x7d7d7d);
      //  model.children[0].children[1].material.color.set(0x121212);
        model.children[0].children[2].material.color.set(0x7d7d7d);

        loadAllPods();
        // make material shine
     //   model.children[0].children[1].material.metalness = 1;
     //   model.children[0].children[1].material.roughness = 0.5;

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


            facemesh.scale.set(10, 9.5, 7.7);
            //facemesh.scale.set(120, 120, 92);


            facemesh.rotation.set(0, 0, 0);

            facemesh.material = new THREE.MeshStandardMaterial({ color: 0xffffff, depthWrite: false });
            facemesh.material.metalness = 1;
            facemesh.material.roughness = 5;

            controls = new OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 100, 0);
            controls.enableZoom = true;
            controls.minDistance = 100;
            controls.maxDistance = 3800;

            controls.update();


// Raycaster and Mouse
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to handle clicks
function onMouseClick(event) {
    // Calculate mouse position in normalized device coordinates
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Check for intersections with objects
    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;

        // Calculate a position for the camera to move towards
        const targetPosition = clickedObject.position.clone();
        const direction = camera.position.clone().sub(targetPosition).normalize();
        const newCameraPosition = targetPosition.clone().add(direction.multiplyScalar(5));

        // Smoothly move the camera
        gsap.to(camera.position, {
            x: newCameraPosition.x,
            y: newCameraPosition.y,
            z: newCameraPosition.z,
            duration: 1,
            onComplete: () => {
                // Once the camera stops moving, ensure it looks at the target
                controls.target.copy(targetPosition);
                controls.update();
            },
        });
    }
}

// Add the event listener for mouse click
//window.addEventListener('click', onMouseClick, false);


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
            
        

            document.getElementById("splashScreen").style.opacity = "0";
            setTimeout(function () {
                document.getElementById("splashScreen").style.display = "none";
            }, 300);
        });

}


function debounce(func, time){
    var time = time || 100; // 100 by default if no param
    var timer;
    return function(event){
        if(timer) clearTimeout(timer);
        timer = setTimeout(func, time, event);
    };
}


// Eventlistener
window.addEventListener("resize", debounce( onWindowResize, 150 ));
//window.addEventListener("resize", onWindowResize);

function onWindowResize() {

    window.location.reload();

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();


    renderer.setSize(window.innerWidth, window.innerHeight);



}

//

function animate() {
    requestAnimationFrame(animate);

    if (model) {
        var head = model.getObjectByName("mmHead");
        if (head && facemesh) {
            head.getWorldPosition(facemesh.position);
            head.getWorldQuaternion(facemesh.quaternion);
        }
    }

    renderer.render(scene, camera);
    if(controls)
        controls.update();

    if(viewportGizmo)
        viewportGizmo.render();

}


window.podArray = [];
function loadAllPods() {

    // load phone.glb
    var phoneLoader = new GLTFLoader();
    phoneLoader.load("./glbs/phone.glb", function (object) {
        window.phone = object.scene;

        phone.children[0].material.color.set(0x000000);
        phone.children[1].material.color.set(0xffffff);
        // aquamarine
        phone.children[2].material.color.set(0xffffff);
        phone.children[3].material.color.set(0x000000);
        phone.children[4].material.color.set(0x000000);

        // metalness and roughness
        phone.children[1].material.metalness = 1;
        phone.children[1].material.roughness = 0.5;
        phone.castShadow = true;
        phone.receiveShadow = true;
        phone.scale.set(3, 3, 3);
        phone.rotation.set(0, Math.PI, 0);
        phone.position.set(0, 100, 12);
        scene.add(phone);
    });

    // load 14 pods, 1 for each bone glbs/pod.glb
    var podLoader = new GLTFLoader();
    var podCount = 14;
    for (var i = 1; i <= podCount; i++) {
        podLoader.load("./glbs/pod.glb", function (object) {
            var pod = object.scene;
            window.podArray.push(pod);

            pod.children[0].children[1].material.color.set(0x7d7d7d);
            pod.children[0].children[0].material.color.set(0xffffff);
         

            //make material shine
            pod.children[0].children[0].material.metalness = 1;
            pod.children[0].children[0].material.roughness = 0.5;
            pod.children[0].children[1].material.metalness = 1;
            pod.children[0].children[1].material.roughness = 0.5;


  
            // cast and receive shadow
            pod.children[0].castShadow = true;
            pod.children[0].receiveShadow = true;
            pod.scale.set(.12, .12, .12);
            pod.position.set(100, 0, 0);
            scene.add(pod);
        });
    }

    M.toast({ html: "Hold down shift key and drag to pan the camera when zoomed" });

    setTimeout(function () {
        // head
        var pod = window.podArray[0];
        pod.position.set(-2, 168, 8);
        pod.rotation.set(Math.PI/2 - Math.PI/180*20, Math.PI/2, 0);


        // spine
        var pod = window.podArray[1];
        pod.position.set(-2, 137, 14);
        pod.rotation.set(Math.PI/2 - Math.PI/180*20, Math.PI/2, 0);

        // right arm
        var pod = window.podArray[2];
        pod.position.set(-30, 148, -4);
        pod.rotation.set(-Math.PI, 0, Math.PI - Math.PI/180*10);

        // right forearm
        var pod = window.podArray[3];
        pod.position.set(-56, 147, -4);
        pod.rotation.set(-Math.PI, 0, Math.PI-Math.PI/180*8);

        // right hand
        var pod = window.podArray[4];
        pod.position.set(-77, 146, -4);
        pod.rotation.set(Math.PI, 0, Math.PI);

        // left arm
        var pod = window.podArray[5];
        pod.position.set(30, 148, -8);
        pod.rotation.set(-Math.PI, Math.PI, Math.PI - Math.PI/180*10);

        // left forearm
        var pod = window.podArray[6];
        pod.position.set(58, 147, -8);
        pod.rotation.set(-Math.PI, Math.PI, Math.PI - Math.PI/180*8);

        // left hand
        var pod = window.podArray[7];
        pod.position.set(77, 146, -8);
        pod.rotation.set(Math.PI, Math.PI, Math.PI);


        // right thigh
        var pod = window.podArray[8];
        pod.position.set(-12, 65, 6.5);
        pod.rotation.set( Math.PI/180*15, Math.PI/2, Math.PI/2);

        // right calf
        var pod = window.podArray[9];
        pod.position.set(-11, 30, 2.2);
        pod.rotation.set(Math.PI/180*10, Math.PI/2, Math.PI/2);

        // right foot
        var pod = window.podArray[10];
        pod.position.set(-7, 9, 4);
        pod.rotation.set(0, -Math.PI/2, -Math.PI/180*20);

        // left thigh
        var pod = window.podArray[11];
        pod.position.set(8, 65, 6.5);
        pod.rotation.set( Math.PI/180*15, Math.PI/2, Math.PI/2);

        // left calf
        var pod = window.podArray[12];
        pod.position.set(7, 30, 2.2);
        pod.rotation.set(Math.PI/180*10, Math.PI/2, Math.PI/2);

        // left foot
        var pod = window.podArray[13];
        pod.position.set(11, 9, 4);
        pod.rotation.set(0, -Math.PI/2, -Math.PI/180*20);


    }, 300);
}