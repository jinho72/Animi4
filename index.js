// script.js (ES module)
//
// 1. Sets up the 3D lotus with Three.js.
// 2. Handles the breathing cycle and modes.
// 3. Uses MediaPipe FaceDetector to track your head
//    so petals spiral around your face during inhale.

// ---------- IMPORTS ----------

// Three.js as an ES module
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

// MediaPipe Tasks Vision: FaceDetector + FilesetResolver
import {
  FilesetResolver,
  FaceDetector
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/vision_bundle.js";

// ---------- BACKGROUND MUSIC TRACKS ----------
// Use RAW GitHub URLs, not normal page URLs
const musicTracks = [
  "https://raw.githubusercontent.com/jinho72/Animi/bb2abe03a1617f20c3ca1579a15dde94130b5ad2/meditation-music-338902.mp3",
  "https://raw.githubusercontent.com/jinho72/Animi/bb2abe03a1617f20c3ca1579a15dde94130b5ad2/meditation-background-409198.mp3",
  "https://raw.githubusercontent.com/jinho72/Animi/bb2abe03a1617f20c3ca1579a15dde94130b5ad2/meditation-background-434654.mp3"
];

// ---------- DOM ELEMENTS ----------

const lotusContainer = document.getElementById("lotusContainer");
const instructionText = document.getElementById("instructionText");
const cycleText = document.getElementById("cycleText");
const faceStatus = document.getElementById("faceStatus");

const breathToggleBtn = document.getElementById("breathToggleBtn");
const settingsToggleBtn = document.getElementById("settingsToggleBtn");
const cameraBtn = document.getElementById("cameraBtn");
const modeButtonsContainer = document.getElementById("modeButtons");
const modeButtons = Array.from(document.querySelectorAll(".mode-btn"));

const webcamVideo = document.getElementById("webcam");

// Music elements
const musicBtn = document.getElementById("musicBtn");
const bgMusic = document.getElementById("bgMusic");
let musicOn = false;

//orb elements
// Orbs (background blobs)
const orbPurple = document.querySelector(".orb-purple");
const orbBlue   = document.querySelector(".orb-blue");
const orbPink   = document.querySelector(".orb-pink");


//subtitle elements
const subtitle = document.getElementById("subtitle");

//
const tmpHeadTarget = new THREE.Vector3();

// Subtitle changes as user progresses
const subtitleScript = [
  { minCycle: 0, text: "Bring Minds, Change Minds" },
  { minCycle: 1, text: "Make sure your sound is on and your are in your comfortable posture" },
  { minCycle: 2, text: "Focus on your breathing." },
  { minCycle: 3, text: "Stay with the rhythm. You’re doing great." },
  { minCycle: 5, text: "Notice how your body feels a little lighter." },
];

function updateSubtitle() {
  if (!subtitle) return;

  // default to the first line
  let currentText = subtitleScript[0].text;

  // pick the last line whose minCycle <= cycleCount
  for (const entry of subtitleScript) {
    if (cycleCount >= entry.minCycle) {
      currentText = entry.text;
    }
  }

  subtitle.textContent = currentText;
}


// ---------- BREATHING STATE & CONFIG ----------

const modes = {
  balance: { name: "Balance", inhale: 4, hold: 4, exhale: 4 },
  calm: { name: "Calm", inhale: 4, hold: 7, exhale: 8 },
  energize: { name: "Energize", inhale: 4, hold: 4, exhale: 2 }
};

let isBreathing = false;
let breathPhase = "idle"; // 'inhale' | 'hold' | 'exhale' | 'rest' | 'idle'
let cycleCount = 0;
let selectedModeKey = "balance";
let breathTimeoutId = null;

// Timestamp when the current phase started – for animation timing
let breathPhaseStartTime = performance.now();

// Display text for each breathing phase
function getInstructionText() {
  switch (breathPhase) {
    case "inhale":
      return "Breathe In";
    case "hold":
      return "Hold";
    case "exhale":
      return "Breathe Out";
    case "rest":
      return "Rest";
    default:
      return "Ready to Begin";
  }
}

// Update the instruction + cycle count text in the UI
function updateInstructionUI() {
  instructionText.textContent = getInstructionText();
  if (cycleCount > 0) {
    cycleText.textContent = `${cycleCount} cycle${cycleCount === 1 ? "" : "s"}`;
  } else {
    cycleText.textContent = "";
  }
  updateSubtitle();
}

// When phase changes, record start time so animation can sync
function setBreathPhase(phase) {
  breathPhase = phase;
  breathPhaseStartTime = performance.now();
  updateInstructionUI();
}

// Breathing sequence: inhale -> hold -> exhale -> rest -> repeat
function startBreathingSequence() {
  const mode = modes[selectedModeKey];

  const sequence = [
    { phase: "inhale", duration: mode.inhale * 1000 },
    { phase: "hold", duration: mode.hold * 1000 },
    { phase: "exhale", duration: mode.exhale * 1000 },
    { phase: "rest", duration: 1000 }
  ];

  let currentStep = 0;

  function runStep() {
    if (!isBreathing) return; // stop if user paused

    const step = sequence[currentStep];
    setBreathPhase(step.phase);

    breathTimeoutId = setTimeout(() => {
      currentStep++;
      if (currentStep >= sequence.length) {
        currentStep = 0;
        cycleCount += 1;
        updateInstructionUI();
      }
      runStep();
    }, step.duration);
  }

  runStep();
}

// Stop breathing loop and reset state
function stopBreathingSequence() {
  clearTimeout(breathTimeoutId);
  breathTimeoutId = null;
  breathPhase = "idle";
  updateInstructionUI();
  
}

// Play/pause breathing on button click
breathToggleBtn.addEventListener("click", () => {
  isBreathing = !isBreathing;

  if (isBreathing) {
    cycleCount = 0;
    breathToggleBtn.textContent = "⏸ Pause Breathing";
    breathToggleBtn.classList.add("primary");
    startBreathingSequence();
    startMusic();
  } else {
    breathToggleBtn.textContent = "▶ Start Breathing";
    breathToggleBtn.classList.remove("primary");
    stopBreathingSequence();
    stopMusic();
  }
});

// Toggle visibility of breathing mode buttons
settingsToggleBtn.addEventListener("click", () => {
  //modeButtonsContainer.classList.toggle("active");// currently this is a problem
  modeButtonsContainer.classList.toggle("hidden");
});

// Change breathing mode
modeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const selected = btn.getAttribute("data-mode");
    if (!selected) return;
    selectedModeKey = selected;
    
    
    //Highlight selected mode
    modeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    
    //smooth fade out animation
    //modeButtonsContainer.classList.remove("active");
    
    //Hide the mode overlay when the choice is made
    modeButtonsContainer.classList.add("hidden");

    if (isBreathing) {
      stopBreathingSequence();
      startBreathingSequence();
    }
  });
});

// ---------- THREE.JS SCENE SETUP ----------

let scene, camera, renderer;
let lotusGroup;
let petalMeshes = [];

// 3D point we consider as "head position" in the scene.
const headAnchor = new THREE.Vector3(0, 1.5, 0);
let hasFace = false;

//head sphere to mimic the movement
let headOccluder = null;

// Initialize Three.js
function initThree() {
  scene = new THREE.Scene();

  const width = lotusContainer.clientWidth;
  const height = lotusContainer.clientHeight;

  camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.set(0, 2, 8);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  lotusContainer.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const dir1 = new THREE.DirectionalLight(0xffffff, 0.6);
  dir1.position.set(5, 10, 5);
  scene.add(dir1);

  const dir2 = new THREE.DirectionalLight(0x9370db, 0.4);
  dir2.position.set(-5, -5, -5);
  scene.add(dir2);

  const point = new THREE.PointLight(0xff69b4, 0.7, 50);
  point.position.set(0, 5, 5);
  scene.add(point);

  createLotusPetals();
  createHeadOccluder();

  window.addEventListener("resize", onWindowResize);

  animate();
}

// Resize Three.js when container changes size
function onWindowResize() {
  const width = lotusContainer.clientWidth;
  const height = lotusContainer.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Procedural lotus petals
function createLotusPetals() {
  lotusGroup = new THREE.Group();
  scene.add(lotusGroup);

  petalMeshes = [];

  const petalMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffc0e5,
    metalness: 0.1,
    roughness: 0.2,
    transparent: true,
    opacity: 0.85,
    transmission: 0.3,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    side: THREE.DoubleSide
  });

  const petalCount = 10;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;

    const petalShape = new THREE.Shape();
    petalShape.moveTo(0, 0);
    petalShape.bezierCurveTo(0.3, 0.5, 0.5, 1.2, 0, 2);
    petalShape.bezierCurveTo(-0.5, 1.2, -0.3, 0.5, 0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3
    };

    const geometry = new THREE.ExtrudeGeometry(petalShape, extrudeSettings);
    const petal = new THREE.Mesh(geometry, petalMaterial.clone());

    petal.position.x = Math.cos(angle) * 0.3;
    petal.position.z = Math.sin(angle) * 0.3;
    petal.position.y = 0;
    petal.rotation.y = angle;
    petal.rotation.x = Math.PI * 0.15;

    lotusGroup.add(petal);
    petalMeshes.push(petal);
  }
  const centerGeometry = new THREE.CircleGeometry(0.4, 32);
  const centerMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffeb3b,
    metalness: 0.2,
    roughness: 0.3,
    side: THREE.DoubleSide
  });
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.rotation.x = -Math.PI / 2;
  center.position.y = 0.1;
  lotusGroup.add(center);
}

//function for adding depth to the headsphere
function createHeadOccluder() {
  const geometry = new THREE.SphereGeometry(1,32,32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.0   
  });
  material.depthWrite = true;
  material.colorWrite = false;
  material.depthTest = true;
  
  headOccluder = new THREE.Mesh(geometry,material);
  headOccluder.visible = true;
  headOccluder.renderOrder = 0;
  scene.add(headOccluder);

}

// Main render loop
function animate() {
  requestAnimationFrame(animate);

  //lotusGroup.rotation.y += 0.003;//main issue with the head-petals coordination
  /* 
  	•	petal.position.x = anchor.x + ... is in lotusGroup’s local space.
	•	When you rotate the entire group, “right” in local space is no longer “right” on the screen.
	•	So even if headAnchor is correct, the group rotation makes petals appear to move in the opposite / weird direction.
*/

  updatePetalsByBreath();

  renderer.render(scene, camera);
}
  
// Petal animation based on breathing phase and head position
function updatePetalsByBreath() {
  if (!petalMeshes.length) return;

  const now = performance.now();
  const elapsed = now - breathPhaseStartTime;

  const mode = modes[selectedModeKey];
  let duration = 1000;

  if (breathPhase === "inhale") {
    duration = mode.inhale * 1000;
  } else if (breathPhase === "hold") {
    duration = mode.hold * 1000;
  } else if (breathPhase === "exhale") {
    duration = mode.exhale * 1000;
  }

  const progress = Math.min(elapsed / duration, 1);

  const eased =
    progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

  const petals = petalMeshes;
  const count = petals.length;

  const anchor = hasFace ? headAnchor : new THREE.Vector3(0, 1.5, 0);

  petals.forEach((petal, i) => {
    const angle = (i / count) * Math.PI * 2;

    if (breathPhase === "inhale") {
      const radius = 0.3 + eased * 2.5;
      const height = eased * 2.5;
      const spiralAngle = angle + eased * Math.PI * 2;

      petal.position.x = anchor.x + Math.cos(spiralAngle) * radius;
      petal.position.z = anchor.z + Math.sin(spiralAngle) * radius;
      petal.position.y = anchor.y + height;

      petal.rotation.y = angle + eased * Math.PI * 4;
      petal.rotation.x = Math.PI * 0.15 + eased * Math.PI * 0.5;
      petal.rotation.z = eased * Math.PI;
    } else if (breathPhase === "exhale") {
      const radius = 2.8 - eased * 2.5;
      const height = 3 - eased * 3;
      const spiralAngle = angle + Math.PI * 2 - eased * Math.PI * 2;


      petal.position.x = anchor.x + Math.cos(spiralAngle) * radius;
      petal.position.z = anchor.z + Math.sin(spiralAngle) * radius;
      petal.position.y = anchor.y + height;

      petal.rotation.y = angle + Math.PI * 4 - eased * Math.PI * 4;
      petal.rotation.x = Math.PI * 0.65 - eased * Math.PI * 0.5;
      petal.rotation.z = Math.PI - eased * Math.PI;
    } else if (breathPhase === "hold") {
      const orbitSpeed = (elapsed * 0.0005) % (Math.PI * 2);
      const radius = 2.8;
      const spiralAngle = angle + Math.PI * 2 + orbitSpeed;

      petal.position.x = anchor.x + Math.cos(spiralAngle) * radius;
      petal.position.z = anchor.z + Math.sin(spiralAngle) * radius;
      petal.position.y = anchor.y + 3;

      petal.rotation.y = angle + Math.PI * 4 + orbitSpeed * 2;
    } else {
      const smallOrbit = (now * 0.0001 + i * 0.2) % (Math.PI * 2);
      const baseRadius = 0.5;
      petal.position.x = anchor.x + Math.cos(angle + smallOrbit) * baseRadius;
      petal.position.z = anchor.z + Math.sin(angle + smallOrbit) * baseRadius;
      petal.position.y = anchor.y + 0.1 + Math.sin(now * 0.001 + i) * 0.05;
    }
  });
}

// ---------- MEDIAPIPE FACE DETECTOR ----------

let faceDetector = null;
let runningMode = "VIDEO";
let lastVideoTime = -1;

// Initialize FaceDetector once (lazy: on first camera click)
async function initFaceDetector() {
  faceStatus.textContent = "Loading face detector model...";

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );

  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
      delegate: "GPU"
    },
    runningMode
  });

  faceStatus.textContent =
    'Face detector ready – click "Enable Camera" to allow access.';
}

// Simple feature-detect of getUserMedia
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// Turn on camera + start prediction loop
cameraBtn.addEventListener("click", async () => {
  if (!hasGetUserMedia()) {
    alert("getUserMedia() is not supported by your browser.");
    return;
  }

  cameraBtn.disabled = true;
  cameraBtn.textContent = "Camera Loading...";

  if (!faceDetector) {
    try {
      await initFaceDetector();
    } catch (e) {
      console.error(e);
      faceStatus.textContent = "Failed to load face detector.";
      cameraBtn.disabled = false;
      cameraBtn.textContent = "Enable Camera";
      return;
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" }
    });

    webcamVideo.srcObject = stream;

    webcamVideo.addEventListener("loadeddata", () => {
      if (!webcamVideo.dataset.started) {
        webcamVideo.dataset.started = "true";
        predictWebcam();
      }
    });

    cameraBtn.textContent = "Camera On";
    faceStatus.textContent =
      "Camera on – move your head and inhale to let petals follow.";
  } catch (err) {
    console.error("Error accessing webcam:", err);
    alert("Could not access camera. Check permissions and try again.");
    cameraBtn.disabled = false;
    cameraBtn.textContent = "Enable Camera";
  }
});

// Main detection loop
async function predictWebcam() {
  if (!webcamVideo || webcamVideo.readyState < 2) {
    requestAnimationFrame(predictWebcam);
    return;
  }

  if (!faceDetector) {
    requestAnimationFrame(predictWebcam);
    return;
  }

  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await faceDetector.setOptions({ runningMode: "VIDEO" });
  }

  const startTimeMs = performance.now();

  if (webcamVideo.currentTime !== lastVideoTime) {
    lastVideoTime = webcamVideo.currentTime;

    const result = await faceDetector.detectForVideo(webcamVideo, startTimeMs);
    console.log("detections:", result.detections);

    const detections = result.detections || [];

    if (detections.length > 0) {
      const d = detections[0];
      const box = d.boundingBox;

      const vw = webcamVideo.videoWidth;
      const vh = webcamVideo.videoHeight;

      const centerX = box.originX + box.width / 2;
      const centerY = box.originY + box.height / 2;

      const nx = centerX / vw;
      const ny = centerY / vh;
      
      const mirroredNx = 1 - nx;
      const faceSize = box.height / vh;

      const worldX = (mirroredNx - 0.5) * 4.0;
      const worldY = (0.5 - ny) * 3.0 + 1.2;
      //const worldZ = 0;
      // Simple depth: when your face is smaller, move anchor “back”
      const worldZ = THREE.MathUtils.clamp((0.45 - faceSize) * 10, -2.5, 1.0);

      const target = new THREE.Vector3(worldX, worldY, worldZ);
      //tempHeadTarget.set(worldX, worldY, worldZ);
      
      //headAnchor.lerp(tmpHeadTarget, 0.7);
      headAnchor.copy(target);
      hasFace = true;

      if (headOccluder) {
        headOccluder.visible = true
        headOccluder.position.copy(headAnchor);
        
        const headScale = (box.width / vw) * 5.0;
        headOccluder.scale.setScalar(headScale);
      }
      hasFace = true;
      faceStatus.textContent =
        "Face detected – petals follow your head on inhale.";
    } else {
      hasFace = false;
      faceStatus.textContent =
        "No face detected – stay in frame, facing the camera.";
    }
  }

  requestAnimationFrame(predictWebcam);
}

// ---------- AUDIO ANALYSER + ORB VISUALIZER ----------
let audioCtx = null;
let analyser = null;
let analyserData = null;
let orbVizRunning = false;

function initAudioAnalyser() {
  if (!bgMusic) return;
  if (audioCtx) return; // already created for this <audio>

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(bgMusic);

  analyser = new AnalyserNode(audioCtx, { fftSize: 256 });
  analyserData = new Uint8Array(analyser.frequencyBinCount);

  // audio: <audio> -> analyser -> speakers
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function startOrbVisualizer() {
  if (!analyser || orbVizRunning) return;
  orbVizRunning = true;

  // Let CSS know we're now audio-driven
  orbPurple && orbPurple.classList.add("reactive");
  orbBlue   && orbBlue.classList.add("reactive");
  orbPink   && orbPink.classList.add("reactive");

  requestAnimationFrame(orbVizLoop);
}

function stopOrbVisualizer() {
  orbVizRunning = false;

  // Optional: gently reset back to baseline
  [orbPurple, orbBlue, orbPink].forEach((orb) => {
    if (!orb) return;
    orb.style.transform = "";
    orb.style.opacity = "";
    orb.style.backgroundColor = "";
    orb.classList.remove("reactive");
  });
}

function orbVizLoop() {
  if (!orbVizRunning || !analyser || !analyserData) return;

  analyser.getByteFrequencyData(analyserData);

  // average energy (0–255) -> 0–1
  let sum = 0;
  for (let i = 0; i < analyserData.length; i++) sum += analyserData[i];
  let level = sum / analyserData.length / 255;

  // Make it subtle & meditative
  const eased = Math.pow(level, 0.8); // gentle curve
  const baseScale = 1.0;
  const maxExtraScale = 0.35; // how much they grow/shrink
  const scale = baseScale + eased * maxExtraScale;

  // Base hues for each orb
  const huePurple = 275;
  const hueBlue   = 205;
  const huePink   = 325;

  // Wiggle hues a bit with the music
  const hueOffset = eased * 30; // +/- ~30 degrees

  if (orbPurple) {
    orbPurple.style.backgroundColor = `hsl(${huePurple + hueOffset}, 85%, 65%)`;
    orbPurple.style.opacity = 0.25 + eased * 0.4;   // 0.25–0.65
    orbPurple.style.transform = `scale(${scale})`;
  }

  if (orbBlue) {
    orbBlue.style.backgroundColor = `hsl(${hueBlue + hueOffset}, 80%, 65%)`;
    orbBlue.style.opacity = 0.2 + eased * 0.35;
    orbBlue.style.transform = `scale(${scale * 0.95})`;
  }

  if (orbPink) {
    orbPink.style.backgroundColor = `hsl(${huePink + hueOffset}, 90%, 70%)`;
    orbPink.style.opacity = 0.22 + eased * 0.45;
    orbPink.style.transform = `scale(${scale * 1.05})`;
  }

  requestAnimationFrame(orbVizLoop);
}

// ---------- MUSIC SETUP (SIMPLE + WORKING) ----------

// pick a random file from musicTracks
function chooseRandomTrack() {
  const index = Math.floor(Math.random() * musicTracks.length);
  return musicTracks[index];
}

function startMusic() {
  if (!bgMusic) {
    console.log("[MUSIC] No bgMusic element found");
    return;
  }
  if (musicOn) {
    console.log("[MUSIC] Already playing");
    return;
  }

  const track = chooseRandomTrack();
  bgMusic.src = track;
  bgMusic.volume = 0.7; // loud enough
  console.log("[MUSIC] Selected track:", track);

  bgMusic
    .play()
    .then(() => {
      console.log("[MUSIC] Playback started successfully.");
      musicOn = true;
    })
    .catch((err) => {
      console.log("[MUSIC] Playback blocked or failed:", err);
    });
}

function stopMusic() {
  if (!bgMusic || !musicOn) return;
  console.log("[MUSIC] Turning music off...");
  bgMusic.pause();
  musicOn = false;
}

// Wire up the music button
if (musicBtn && bgMusic) {
  musicBtn.addEventListener("click", () => {
    if (!musicOn) {
      startMusic();
      musicBtn.textContent = "Sound On";
    } else {
      stopMusic();
      musicBtn.textContent = "Sound Off";
    }
  });
} else {
  console.warn("[MUSIC] musicBtn or bgMusic not found in DOM – skipping music setup.");
}
// ---------- BOOTSTRAP ----------

initThree();
updateInstructionUI();
faceStatus.textContent = 'Click "Enable Camera" to start face detection.';
