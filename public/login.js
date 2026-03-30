/* ═══════════════════════════════════════════════════
FIREBASE IMPORTS
═══════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA-8EuM0leVUJlXozRhvdyCvaceUdwEKhg",
  authDomain: "ai-chatbot-de21a.firebaseapp.com",
  projectId: "ai-chatbot-de21a",
  storageBucket: "ai-chatbot-de21a.firebasestorage.app",
  messagingSenderId: "384073657465",
  appId: "1:384073657465:web:94367acf500801096138a8",
  measurementId: "G-2G1N1GWFN8"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const gProvider = new GoogleAuthProvider();

/* ═══════════════════════════════════════════════════
AUTH STATE — redirect with page flip if already logged in
═══════════════════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
  if (user) navigateWithFlip("index.html");
});

/* ═══════════════════════════════════════════════════
FEATURE 6: rotateY PAGE FLIP TRANSITION
═══════════════════════════════════════════════════ */
function navigateWithFlip(url) {
  document.body.classList.add("flipping");
  setTimeout(() => {
    window.location.href = url;
  }, 580); // match animation duration
}

/* ═══════════════════════════════════════════════════
FEATURE 2: THREE.JS FLOATING PARTICLES (LOGIN PAGE)
═══════════════════════════════════════════════════ */
function initLoginParticles() {
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("loginParticlesCanvas");
  if (!canvas) return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
  camera.position.z = 60;

  const count = 220;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const palette = [
    new THREE.Color(0xb48bff),
    new THREE.Color(0x67e8f9),
    new THREE.Color(0xe879f9),
    new THREE.Color(0x8b5cf6),
    new THREE.Color(0xf0abfc),
    new THREE.Color(0xffffff),
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 160;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

    const c = palette[Math.floor(Math.random() * palette.length)];
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.7,
    vertexColors: true,
    transparent: true,
    opacity: 0.75,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Velocities
  const velocities = [];
  for (let i = 0; i < count; i++) {
    velocities.push({
      x: (Math.random() - 0.5) * 0.012,
      y: (Math.random() - 0.5) * 0.008,
      z: (Math.random() - 0.5) * 0.006,
    });
  }

  // Mouse parallax on login particles
  let mouseX = 0, mouseY = 0;
  window.addEventListener("mousemove", (e) => {
    mouseX = (e.clientX / W - 0.5) * 2;
    mouseY = (e.clientY / H - 0.5) * 2;
  });

  function animate() {
    requestAnimationFrame(animate);
    const pos = geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      pos[i * 3]     += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;

      if (pos[i * 3]     >  80) pos[i * 3]     = -80;
      if (pos[i * 3]     < -80) pos[i * 3]     =  80;
      if (pos[i * 3 + 1] >  60) pos[i * 3 + 1] = -60;
      if (pos[i * 3 + 1] < -60) pos[i * 3 + 1] =  60;
      if (pos[i * 3 + 2] >  40) pos[i * 3 + 2] = -40;
      if (pos[i * 3 + 2] < -40) pos[i * 3 + 2] =  40;
    }
    geometry.attributes.position.needsUpdate = true;

    // Subtle camera drift following mouse
    camera.position.x += (mouseX * 8 - camera.position.x) * 0.04;
    camera.position.y += (-mouseY * 5 - camera.position.y) * 0.04;
    camera.lookAt(scene.position);

    particles.rotation.z += 0.0002;

    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    const nw = window.innerWidth;
    const nh = window.innerHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
}

/* ═══════════════════════════════════════════════════
HELPERS
═══════════════════════════════════════════════════ */
function showMsg(msg, type = "error") {
  const el = document.getElementById("msgBox");
  el.textContent = msg;
  el.className = `login-msg ${type}`;
  setTimeout(() => { el.className = "login-msg"; }, 4000);
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `Please wait <span class="login-spinner"></span>`
    : btn.dataset.label;
}

async function saveUserToFirestore(user) {
  await setDoc(doc(db, "users", user.uid), {
    name: user.displayName || "",
    email: user.email || "",
    photo: user.photoURL || "",
    createdAt: serverTimestamp()
  }, { merge: true });
}

/* ═══════════════════════════════════════════════════
ELEMENTS
═══════════════════════════════════════════════════ */
const emailInput    = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const emailLoginBtn = document.getElementById("emailLoginBtn");
const emailSignupBtn= document.getElementById("emailSignupBtn");
const googleLoginBtn= document.getElementById("googleLoginBtn");
const forgotLink    = document.getElementById("forgotPasswordLink");

// Store original labels
emailLoginBtn.dataset.label  = "Sign In";
emailSignupBtn.dataset.label = "Create Account";
googleLoginBtn.dataset.label = googleLoginBtn.innerHTML;

/* ═══════════════════════════════════════════════════
EMAIL SIGN IN
═══════════════════════════════════════════════════ */
emailLoginBtn.addEventListener("click", async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { showMsg("Please enter email and password."); return; }

  setLoading(emailLoginBtn, true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    navigateWithFlip("index.html"); // Feature 6
  } catch (e) {
    showMsg(e.message.replace("Firebase: ", ""));
    setLoading(emailLoginBtn, false);
  }
});

/* ═══════════════════════════════════════════════════
EMAIL SIGN UP
═══════════════════════════════════════════════════ */
emailSignupBtn.addEventListener("click", async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { showMsg("Please enter email and password."); return; }
  if (password.length < 6) { showMsg("Password must be at least 6 characters."); return; }

  setLoading(emailSignupBtn, true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(cred.user);
    navigateWithFlip("index.html"); // Feature 6
  } catch (e) {
    showMsg(e.message.replace("Firebase: ", ""));
    setLoading(emailSignupBtn, false);
  }
});

/* ═══════════════════════════════════════════════════
GOOGLE SIGN IN
═══════════════════════════════════════════════════ */
googleLoginBtn.addEventListener("click", async () => {
  setLoading(googleLoginBtn, true);
  try {
    const cred = await signInWithPopup(auth, gProvider);
    await saveUserToFirestore(cred.user);
    navigateWithFlip("index.html"); // Feature 6
  } catch (e) {
    if (e.code !== "auth/popup-closed-by-user") {
      showMsg(e.message.replace("Firebase: ", ""));
    }
    setLoading(googleLoginBtn, false);
  }
});

/* ═══════════════════════════════════════════════════
FORGOT PASSWORD
═══════════════════════════════════════════════════ */
forgotLink.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) { showMsg("Enter your email above first."); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showMsg("Reset email sent! Check your inbox.", "success");
  } catch (e) {
    showMsg(e.message.replace("Firebase: ", ""));
  }
});

/* Enter key support */
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") emailLoginBtn.click();
});

/* ═══════════════════════════════════════════════════
INIT
═══════════════════════════════════════════════════ */
window.addEventListener("load", () => {
  initLoginParticles(); // Feature 2
});