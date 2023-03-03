var rigPrefix = "mixamorig";
var velocityArray = []
var dist = [0, 0, 0]
var mov = []
const freq = 0.015
var counter=0
var u = [0,0,0]

var mac2BonesKalman = new Object();

function calibrate() {
  var keys = Object.keys(mac2Bones);
  for (var i = 0; i < keys.length; i++) {
    mac2Bones[keys[i]].calibration.x = mac2Bones[keys[i]].last.x;
    mac2Bones[keys[i]].calibration.y = mac2Bones[keys[i]].last.y;
    mac2Bones[keys[i]].calibration.z = mac2Bones[keys[i]].last.z;
    mac2Bones[keys[i]].calibration.w = mac2Bones[keys[i]].last.w;

    mac2BonesKalman[keys[i]] = {x: null, y: null, z: null, w: null};

    mac2BonesKalman[keys[i]].x = new KalmanFilter({R: 1000, Q: 0.001});
    mac2BonesKalman[keys[i]].y = new KalmanFilter({R: 1000, Q: 0.001});
    mac2BonesKalman[keys[i]].z = new KalmanFilter({R: 1000, Q: 0.001});
    mac2BonesKalman[keys[i]].w = new KalmanFilter({R: 1000, Q: 0.001});
  }
}

function handleWSMessage(obj) {
   // if (mac2Bones[obj.id].id == "LeftHand") {
     // console.log(mac2Bones[obj.id].id);
     mac2Bones[obj.id].last.x = obj.x;
     mac2Bones[obj.id].last.y = obj.y;
     mac2Bones[obj.id].last.z = obj.z;
     mac2Bones[obj.id].last.w = obj.w;
     var bone = mac2Bones[obj.id].id;
     var x = model.getObjectByName(rigPrefix + bone);
     var q = new Quaternion(obj.x, obj.y, obj.z, obj.w);
     // var q = new Quaternion(obj.w, obj.x, obj.y, obj.z);

     // var a = new Quaternion(Math.cos(30), -Math.sin(30), -Math.sin(30), -Math.sin(30))
     // a = a.normalize()

     var e = qte(q)
     // console.log("e " + 180 * e.x / Math.PI, 180 * e.y / Math.PI, 180 * e.z / Math.PI);

     var wQ = new Quaternion(1, 0, 0, 0);
     q = q.mul(wQ.inverse())

     var qC = new Quaternion(
       mac2Bones[obj.id].calibration.x,
       mac2Bones[obj.id].calibration.y,
       mac2Bones[obj.id].calibration.z,
       mac2Bones[obj.id].calibration.w
     );

     var qR = q.mul(qC.inverse());

     var e = qte(qR)
     var e1 = getParentQuat(obj.id);
     // if (mac2Bones[obj.id].id == "Hips") {
     //   // var R = quatern2rotMat([obj.w, obj.x, obj.y, obj.z])
     //   // var linearAcc = numeric.dot([obj.accX*9.81, obj.accY*9.81, obj.accZ*9.81], R)
     //   // linearAcc[2] = linearAcc[2] - 9.81
     //   //
     //   // linear_aX = linearAcc[0]
     //   // linear_aY = linearAcc[1]
     //   // linear_aZ = linearAcc[2]
     //
     //   // console.log(linear_aX, linear_aY, linear_aZ)
     //
     //   // if(Math.sqrt(linear_aX*linear_aX+linear_aY*linear_aY+linear_aZ*linear_aZ)<2) {
     //   //   linear_aX = 0
     //   //   linear_aY = 0
     //   //   linear_aZ = 0
     //   //
     //   //   velocity[0] = 0
     //   //   velocity[1] = 0
     //   //   velocity[2] = 0
     //   // }
     //
     //   // velocity[0] = velocity[0] + linear_aX * freq
     //   // velocity[1] = velocity[1] + linear_aY * freq
     //   // velocity[2] = velocity[2] + linear_aZ * freq
     //   //
     //   // var movX = velocity[0] * freq
     //   // var movY = velocity[1] * freq
     //   // var movZ = velocity[2] * freq
     //   //
     //   // dist[0] += movX*10
     //   // dist[1] += movY*10
     //   // dist[2] += movZ*10
     //
     //   // console.log("vel", velocity)
     //   // console.log("dist" , dist)
     //
     //   // x.position.set(obj.disX, obj.disY, obj.disZ)
     //
     //   // console.log(obj.movement)
     //
     //
     //
     //   if(obj.movement) {
     //     var velocity = [0, 0, 0, 0]
     //
     //     velocity[0] = u[0] + obj.LaccX * freq;
     //     velocity[1] = u[1] + obj.LaccY * freq;
     //     velocity[2] = u[2] + obj.LaccZ * freq;
     //
     //     // velocity[0] = u[0] + linear_aX * freq;
     //     // velocity[1] = u[1] + linear_aY * freq;
     //     // velocity[2] = u[2] + linear_aZ * freq;
     //
     //     velocity[3] = counter;
     //     u[0] = velocity[0]
     //     u[1] = velocity[1]
     //     u[2] = velocity[2]
     //     counter += 1
     //     velocityArray.push(velocity)
     //     // console.log(velocity)
     //
     //
     //     // if(velocityArray.length == 100) {
     //     //   var last = velocityArray[velocityArray.length-1]
     //     //   last[0] /= velocityArray.length
     //     //   last[1] /= velocityArray.length
     //     //   last[2] /= velocityArray.length
     //
     //
     //
     //     //   var dummy = velocityArray.shift()
     //
     //     //   dummy[0] = dummy[0] - dummy[3] * last[0]
     //     //   dummy[1] = dummy[1] - dummy[3] * last[1]
     //     //   dummy[2] = dummy[2] - dummy[3] * last[2]
     //
     //     //   // console.log(dummy)
     //
     //     //   var movX = dummy[0] * freq
     //     //   var movY = dummy[1] * freq
     //     //   var movZ = dummy[2] * freq
     //
     //     //   // console.log(movX, movY, movZ)
     //     //   dist[0] += movX * 10
     //     //   dist[1] += movY * 10
     //     //   dist[2] += movZ * 10
     //     //   console.log(dist)
     //
     //     //   x.translateX(movX)
     //     //   x.translateY(-movZ)
     //     //   x.translateZ(movY)
     //     // }
     //   } else {
     //     counter=0
     //     u = [0, 0, 0]
     //     var locallength=velocityArray.length
     //     while(velocityArray.length>0) {
     //       var last = velocityArray[velocityArray.length-1]
     //       last[0] /= locallength
     //       last[1] /= locallength
     //       last[2] /= locallength
     //
     //       var Vel_drift = velocityArray.shift()
     //
     //
     //       Vel_drift[0] = Vel_drift[0] - Vel_drift[3] * last[0]
     //       Vel_drift[1] = Vel_drift[1] - Vel_drift[3] * last[1]
     //       Vel_drift[2] = Vel_drift[2] - Vel_drift[3] * last[2]
     //
     //       // console.log(Vel_drift)
     //
     //       var movX = Vel_drift[0] * freq
     //       var movY = Vel_drift[1] * freq
     //       var movZ = Vel_drift[2] * freq
     //
     //       // console.log(movX, movY, movZ)
     //       dist[0] += movX*100
     //       dist[1] += movY*100
     //       dist[2] += movZ*100
     //
     //       console.log(dist)
     //
     //       x.translateX(movX*100)
     //       x.translateY(-movZ*100)
     //       x.translateZ(movY*100)
     //     }
     //   }
     //   // x.translateX(-obj.disX*10);
     //   // x.translateY(-obj.disZ*10);
     //   // x.translateZ(-obj.disY*10);
     // }

     if(e1 == null) {
      //  qR.x = mac2BonesKalman[obj.id].x.filter(qR.x);
      //  qR.y = mac2BonesKalman[obj.id].y.filter(qR.y);
      //  qR.z = mac2BonesKalman[obj.id].z.filter(qR.z);
      //  qR.w = mac2BonesKalman[obj.id].w.filter(qR.w);

      //  qR.x = qR.x.toFixed(3);
      //  qR.y = qR.y.toFixed(3);
      //  qR.z = qR.z.toFixed(3);
      //  qR.w = qR.w.toFixed(3);

      //  qR = qR.normalize();
       if (mac2Bones[obj.id].id == "RightHand") {
         x.quaternion.set(qR.z, -qR.y, -qR.x, qR.w);
         setLocal(obj.id, qR.x, qR.y, qR.z, qR.w)
         setGlobal(obj.id, qR.x, qR.y, qR.z, qR.w)
       } else {
         x.quaternion.set(qR.z, qR.x, -qR.y, qR.w);
         setLocal(obj.id, qR.x, qR.y, qR.z, qR.w)
         setGlobal(obj.id, qR.x, qR.y, qR.z, qR.w)
       }


     } else {
       // console.log("e", qR.x, qR.y , qR.z ,qR.w);
       // console.log("e1", e1.x,e1.y, e1.z,e1.w);

       var ep = qte(e1);
       // console.log("e " + 180 * e.x / Math.PI, 180 * e.y / Math.PI, 180 * e.z / Math.PI);
       // console.log("e1 " + 180 * ep.x / Math.PI, 180 * ep.y / Math.PI, 180 * ep.z / Math.PI);
       // console.log(qR1)

       if (mac2Bones[obj.id].id == "RightHand") {
         var e1q = new Quaternion(e1.w, e1.x, e1.z, e1.y);
         var qR1 = qR.mul(e1q.inverse());
         // console.log("e1q", qR1.x,qR1.y, qR1.z,qR1.w);

        //  qR1.x = mac2BonesKalman[obj.id].x.filter(qR1.x);
        //  qR1.y = mac2BonesKalman[obj.id].y.filter(qR1.y);
        //  qR1.z = mac2BonesKalman[obj.id].z.filter(qR1.z);
        //  qR1.w = mac2BonesKalman[obj.id].w.filter(qR1.w);

        //  qR1.x = qR1.x.toFixed(3);
        //  qR1.y = qR1.y.toFixed(3);
        //  qR1.z = qR1.z.toFixed(3);
        //  qR1.w = qR1.w.toFixed(3);

        //  qR1 = qR1.normalize();
         x.quaternion.set(qR1.z, -qR1.y, -qR1.x, qR1.w);
         setLocal(obj.id, qR1.x, qR1.y, qR1.z, qR1.w)
         setGlobal(obj.id, qR.x, qR.y, qR.z, qR.w)
       } else {
         var e1q = new Quaternion(e1.w, e1.x, e1.y, e1.z);
         var qR1 = qR.mul(e1q.inverse());
         // console.log("e1q", qR1.x,qR1.y, qR1.z,qR1.w);

        //  qR1.x = mac2BonesKalman[obj.id].x.filter(qR1.x);
        //  qR1.y = mac2BonesKalman[obj.id].y.filter(qR1.y);
        //  qR1.z = mac2BonesKalman[obj.id].z.filter(qR1.z);
        //  qR1.w = mac2BonesKalman[obj.id].w.filter(qR1.w);

        //  qR1.x = qR1.x.toFixed(3);
        //  qR1.y = qR1.y.toFixed(3);
        //  qR1.z = qR1.z.toFixed(3);
        //  qR1.w = qR1.w.toFixed(3);

        //  qR1 = qR1.normalize();
         x.quaternion.set(qR1.z, qR1.x, -qR1.y, qR1.w);
         setLocal(obj.id, qR1.x, qR1.y, qR1.z, qR1.w)
         setGlobal(obj.id, qR.x, qR.y, qR.z, qR.w)
       }
     }
   // }
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
