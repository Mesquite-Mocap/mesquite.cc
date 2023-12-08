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

  const canvas = document.getElementById("facecanvasResult");
  const ctx = canvas.getContext("2d");
  const drawingUtils = new DrawingUtils(ctx);

  async function predictFace() {
    let results;
    console.log("predictFace");
    const video = document.getElementById("facevideo");
    let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = faceLandmarker.detectForVideo(video, startTimeMs);
  }
  if (results) {
    console.log(results);
    const landmarks = results.faceLandmarks[0];
    if (landmarks) {
      const canvasElement = document.getElementById("facecanvasResult");
      drawingUtils.drawConnectors(canvasElement, landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: "#C0C0C070",
        lineWidth: 1
      });
      drawingUtils.drawLandmarks(canvasElement, landmarks, {
        color: "#FF0000",
        lineWidth: 1
      });
    }
  }
  window.requestAnimationFrame(predictFace);
  }



  