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

            const controls = new OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 100, 0);
            controls.enableZoom = true;
            controls.minDistance = 100;
            controls.maxDistance = 3800;

            controls.update();


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
            }, 3000);
        });

}




// Eventlistener
//window.addEventListener("resize", debounce( onWindowResize, 150 ));
window.addEventListener("resize", onWindowResize);

function onWindowResize() {

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

    if(viewportGizmo)
        viewportGizmo.render();

}


window.podArray = [];
function loadAllPods() {
    // load 14 pods, 1 for each bone glbs/pod.glb
    var podLoader = new GLTFLoader();
    var podCount = 14;
    for (var i = 1; i <= podCount; i++) {
        podLoader.load("./glbs/pod.glb", function (object) {
            var pod = object.scene;
            window.podArray.push(pod);
            // aquamarine
            pod.children[0].children[0].material.color.set(0x7fffd4);
            pod.children[0].children[1].material.color.set(0x696969);
         
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

    setTimeout(function () {
        // head
        var pod = window.podArray[0];
        pod.position.set(2, 174, 5);
        pod.rotation.set(Math.PI/2 - Math.PI/180*20, -Math.PI/2, 0);


        // spine
        var pod = window.podArray[1];
        pod.position.set(2, 142, 11);
        pod.rotation.set(Math.PI/2 - Math.PI/180*20, -Math.PI/2, 0);

        // right arm
        var pod = window.podArray[2];
        pod.position.set(-35, 147.5, -8);
        pod.rotation.set(Math.PI, -Math.PI, Math.PI);

        // right forearm
        var pod = window.podArray[3];
        pod.position.set(-64, 146, -8);
        pod.rotation.set(Math.PI, -Math.PI, Math.PI);

        // right hand
        var pod = window.podArray[4];
        pod.position.set(-84, 145, -8);
        pod.rotation.set(Math.PI, -Math.PI, Math.PI);

        // left arm
        var pod = window.podArray[5];
        pod.position.set(38, 147, -4.5);
        pod.rotation.set(Math.PI, 0, Math.PI);

        // left forearm
        var pod = window.podArray[6];
        pod.position.set(66, 146, -4.5);
        pod.rotation.set(Math.PI, 0, Math.PI);

        // left hand
        var pod = window.podArray[7];
        pod.position.set(86, 145, -4.5);
        pod.rotation.set(Math.PI, 0, Math.PI);

        // right thigh
        var pod = window.podArray[8];
        pod.position.set(-8, 70, 7);
        pod.rotation.set(Math.PI+ Math.PI/180*10, -Math.PI/2, Math.PI/2);

        // right calf
        var pod = window.podArray[9];
        pod.position.set(-7, 35, 2.2);
        pod.rotation.set(Math.PI+ Math.PI/180*10, -Math.PI/2, Math.PI/2);

        // right foot
        var pod = window.podArray[10];
        pod.position.set(-7, 9, 4);
        pod.rotation.set(Math.PI/2 + Math.PI/180*20, -Math.PI/2, Math.PI/2);

        // left thigh
        var pod = window.podArray[11];
        pod.position.set(12, 70, 7);
        pod.rotation.set(Math.PI + Math.PI/180*10, -Math.PI/2, Math.PI/2);

        // left calf
        var pod = window.podArray[12];
        pod.position.set(11, 35, 2.2);
        pod.rotation.set(Math.PI + Math.PI/180*10, -Math.PI/2, Math.PI/2);

        // left foot
        var pod = window.podArray[13];
        pod.position.set(11, 9, 4);
        pod.rotation.set(Math.PI/2 + Math.PI/180*20, -Math.PI/2, Math.PI/2);


    }, 300);
}