/* ═══════════════════════════════════════════════════
FIREBASE IMPORTS
═══════════════════════════════════════════════════ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  updateProfile, updatePassword, deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, doc, updateDoc
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

/* ═══════════════════════════════════════════════════
AUTH GUARD
═══════════════════════════════════════════════════ */
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    renderUserSection(user);
    fillProfilePanel(user);
  }
});

/* ═══════════════════════════════════════════════════
SIDEBAR USER SECTION
═══════════════════════════════════════════════════ */
function renderUserSection(user) {
  const sec = document.getElementById("userSection");
  const name = user.displayName || user.email?.split("@")[0] || "User";
  const email = user.email || "";
  const photo = user.photoURL;
  const initials = name.slice(0, 2).toUpperCase();

  sec.innerHTML = `<div class="user-card" id="userCard">
    <div class="user-avatar">
      ${photo ? `<img src="${photo}" alt="avatar" onerror="this.style.display='none'"/>` : initials}
    </div>
    <div class="user-info">
      <div class="u-name">${name}</div>
      <div class="u-email">${email}</div>
    </div>
    <span class="user-chevron">›</span>
  </div>`;

  document.getElementById("userCard").addEventListener("click", openProfile);
}

/* ═══════════════════════════════════════════════════
PROFILE PANEL
═══════════════════════════════════════════════════ */
function fillProfilePanel(user) {
  const name = user.displayName || "";
  const email = user.email || "";
  const photo = user.photoURL;
  const initials = (name || email).slice(0, 2).toUpperCase();

  document.getElementById("profileNameDisplay").textContent = name || "—";
  document.getElementById("profileEmailDisplay").textContent = email || "—";
  document.getElementById("editName").value = name;
  document.getElementById("editEmail").value = email;

  const bigText = document.getElementById("bigAvatarText");
  if (photo) {
    bigText.innerHTML = `<img src="${photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display='none'"/>`;
  } else {
    bigText.textContent = initials;
  }
}

function openProfile() {
  document.getElementById("profileScreen").classList.add("active");
}
function closeProfile() {
  document.getElementById("profileScreen").classList.remove("active");
}

document.getElementById("closeProfile").addEventListener("click", closeProfile);
document.getElementById("profileOverlay").addEventListener("click", closeProfile);

/* Save profile */
document.getElementById("saveBtn").addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.innerHTML = `Saving <span class="spinner"></span>`;

  const newName = document.getElementById("editName").value.trim();
  const newPass = document.getElementById("newPassword").value;
  const confPass = document.getElementById("confirmPassword").value;

  try {
    if (newName && newName !== user.displayName) {
      await updateProfile(user, { displayName: newName });
      await updateDoc(doc(db, "users", user.uid), { name: newName });
    }
    if (newPass) {
      if (newPass !== confPass) {
        showProfileMsg("Passwords do not match!", "error");
        btn.disabled = false; btn.textContent = "Save Changes"; return;
      }
      if (newPass.length < 6) {
        showProfileMsg("Password must be at least 6 characters.", "error");
        btn.disabled = false; btn.textContent = "Save Changes"; return;
      }
      await updatePassword(user, newPass);
      document.getElementById("newPassword").value = "";
      document.getElementById("confirmPassword").value = "";
    }
    fillProfilePanel(auth.currentUser);
    renderUserSection(auth.currentUser);
    showProfileMsg("Profile updated! ✓", "success");
  } catch (e) {
    showProfileMsg(e.message.replace("Firebase: ", ""), "error");
  }
  btn.disabled = false; btn.textContent = "Save Changes";
});

/* Avatar upload */
document.getElementById("avatarInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    const dataUrl = ev.target.result;
    try {
      await updateProfile(auth.currentUser, { photoURL: dataUrl });
      await updateDoc(doc(db, "users", auth.currentUser.uid), { photo: dataUrl });
      fillProfilePanel(auth.currentUser);
      renderUserSection(auth.currentUser);
      showProfileMsg("Photo updated! ✓", "success");
    } catch { showProfileMsg("Photo update failed.", "error"); }
  };
  reader.readAsDataURL(file);
});

/* Logout */
document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

/* Delete account */
document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  if (!confirm("Are you sure? This will permanently delete your account.")) return;
  try {
    await deleteUser(auth.currentUser);
    window.location.href = "login.html";
  } catch {
    showProfileMsg("Please log in again before deleting.", "error");
  }
});

function showProfileMsg(msg, type) {
  const el = document.getElementById("profileMsg");
  el.textContent = msg;
  el.className = "profile-msg " + type;
  setTimeout(() => { el.className = "profile-msg"; }, 3500);
}

async function getAuthHeaders(extraHeaders = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  return {
    ...extraHeaders,
    Authorization: `Bearer ${token}`
  };
}

async function handleUnauthorized(res) {
  if (res.status !== 401) return false;
  await signOut(auth);
  window.location.href = "login.html";
  return true;
}

/* ═══════════════════════════════════════════════════
CHAT
═══════════════════════════════════════════════════ */
const chatBox = document.getElementById("chatBox");
const input = document.getElementById("userInput");
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const sendBtn = document.getElementById("sendBtn");
const chatSection = document.getElementById("chatSection");

let chats = JSON.parse(localStorage.getItem("allChats")) || [];
let currentChatId = null;

menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  sidebar.classList.toggle("active");
});
chatSection.addEventListener("click", () => sidebar.classList.remove("active"));
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtn.addEventListener("click", () => { if (!sendBtn.disabled) sendMessage(); });

async function sendMessage() {
  const message = input.value.trim();
  if (!message || sendBtn.disabled) return;
  if (!currentChatId) createNewChat();

  addMessage(message, "user");
  input.value = "";
  sendBtn.disabled = true;

  const div = document.createElement("div");
  div.className = "message bot";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  div.appendChild(bubble);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Attach 3D tilt to new bot bubble
  attachBubbleTilt(bubble);

  try {
    const headers = await getAuthHeaders({ "Content-Type": "application/json" });
    const res = await fetch("/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ message })
    });
    if (await handleUnauthorized(res)) return;
    if (!res.ok || !res.body) throw new Error("Chat failed");
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bubble.textContent += decoder.decode(value);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
    saveCurrentChat();
  } catch {
    bubble.textContent = "⚠️ Server error. Check backend.";
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  div.appendChild(bubble);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Attach 3D tilt to new bubble
  attachBubbleTilt(bubble);

  saveCurrentChat();
}

function createNewChat() {
  currentChatId = Date.now();
  chats.push({ id: currentChatId, title: "New Chat", content: chatBox.innerHTML });
  saveAllChats();
  renderChatList();
}

function newChat() {
  currentChatId = null;
  chatBox.innerHTML = "";
}

function saveCurrentChat() {
  if (!currentChatId) return;
  const chat = chats.find(c => c.id === currentChatId);
  if (!chat) return;
  chat.content = chatBox.innerHTML;
  const first = chatBox.querySelector(".user .bubble");
  if (first) chat.title = first.textContent.slice(0, 30);
  saveAllChats();
}

function openChat(id) {
  const chat = chats.find(c => c.id === id);
  if (!chat) return;
  currentChatId = id;
  chatBox.innerHTML = chat.content;
  // Re-attach tilt to restored bubbles
  chatBox.querySelectorAll(".bubble").forEach(b => attachBubbleTilt(b));
  sidebar.classList.remove("active");
}

function deleteChat(id) {
  chats = chats.filter(c => c.id !== id);
  if (currentChatId === id) { chatBox.innerHTML = ""; currentChatId = null; }
  saveAllChats();
  renderChatList();
}

function clearHistory() {
  if (!confirm("Delete all chats?")) return;
  chats = []; currentChatId = null;
  localStorage.removeItem("allChats");
  chatBox.innerHTML = "";
  renderChatList();
}

function renderChatList() {
  const list = document.querySelector(".menu-list");
  list.innerHTML = `<li onclick="newChat()">🆕 New Chat</li>`;
  chats.forEach(chat => {
    list.innerHTML += `<li onclick="openChat(${chat.id})">
      ${chat.title}
      <span onclick="deleteChat(${chat.id}); event.stopPropagation()">❌</span>
    </li>`;
  });
}

function saveAllChats() {
  localStorage.setItem("allChats", JSON.stringify(chats));
}

/* ═══ THEME ═══ */
function toggleTheme() {
  document.body.classList.toggle("dark");
  localStorage.setItem("theme", document.body.classList.contains("dark"));
}
function loadTheme() {
  if (localStorage.getItem("theme") === "true") document.body.classList.add("dark");
}

/* ═══ INIT ═══ */
window.onload = () => {
  renderChatList();
  loadTheme();
  input.focus();
  initParticles();
  initParallax();
  initVoiceSphere();
};

window.newChat = newChat;
window.openChat = openChat;
window.deleteChat = deleteChat;
window.clearHistory = clearHistory;
window.toggleTheme = toggleTheme;
window.openProfile = openProfile;

/* ═══════════════════════════════════════════════════
FEATURE 1: 3D TILT ON CHAT BUBBLES
Mouse tracking + CSS perspective
═══════════════════════════════════════════════════ */
function attachBubbleTilt(bubble) {
  // 3D tilt disabled — removed for cleaner UX
}

/* ═══════════════════════════════════════════════════
FEATURE 2: THREE.JS FLOATING PARTICLES (CHAT PAGE)
═══════════════════════════════════════════════════ */
function initParticles() {
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("particlesCanvas");
  if (!canvas) return;

  const section = document.getElementById("chatSection");
  const w = section.clientWidth;
  const h = section.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.z = 50;

  // Create particles
  const count = 180;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const colorPalette = [
    new THREE.Color(0x67e8f9), // cyan
    new THREE.Color(0x8b5cf6), // violet
    new THREE.Color(0xe879f9), // pink
    new THREE.Color(0xb48bff), // lavender
    new THREE.Color(0xc084fc), // purple
  ];

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;

    const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.6,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  // Drift velocities
  const velocities = [];
  for (let i = 0; i < count; i++) {
    velocities.push({
      x: (Math.random() - 0.5) * 0.015,
      y: (Math.random() - 0.5) * 0.010,
      z: (Math.random() - 0.5) * 0.008,
    });
  }

  function animateParticles() {
    requestAnimationFrame(animateParticles);
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3]     += velocities[i].x;
      pos[i * 3 + 1] += velocities[i].y;
      pos[i * 3 + 2] += velocities[i].z;

      // Wrap around bounds
      if (pos[i * 3]     >  60) pos[i * 3]     = -60;
      if (pos[i * 3]     < -60) pos[i * 3]     =  60;
      if (pos[i * 3 + 1] >  40) pos[i * 3 + 1] = -40;
      if (pos[i * 3 + 1] < -40) pos[i * 3 + 1] =  40;
      if (pos[i * 3 + 2] >  30) pos[i * 3 + 2] = -30;
      if (pos[i * 3 + 2] < -30) pos[i * 3 + 2] =  30;
    }
    geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.0003;

    renderer.render(scene, camera);
  }
  animateParticles();

  // Resize handler
  window.addEventListener("resize", () => {
    const nw = section.clientWidth;
    const nh = section.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
}

/* ═══════════════════════════════════════════════════
FEATURE 3: THREE.JS GLOWING PULSING SPHERE (VOICE SCREEN)
Replaces the ai-ball div
═══════════════════════════════════════════════════ */
let voiceSphereScene = null;
let voiceSphereState = "idle";

function initVoiceSphere() {
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("voiceSphereCanvas");
  if (!canvas) return;

  const W = 140, H = 140;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 3.5;

  // Main sphere
  const geo = new THREE.SphereGeometry(1, 64, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x4a1d96,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.5,
    transparent: true,
    opacity: 0.92,
  });
  const sphere = new THREE.Mesh(geo, mat);
  scene.add(sphere);

  // Outer glow shell
  const glowGeo = new THREE.SphereGeometry(1.18, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xb48bff,
    transparent: true,
    opacity: 0.12,
    side: THREE.BackSide,
  });
  const glowShell = new THREE.Mesh(glowGeo, glowMat);
  scene.add(glowShell);

  // Lights
  const ambientLight = new THREE.AmbientLight(0x8b5cf6, 0.5);
  scene.add(ambientLight);

  const pointLight1 = new THREE.PointLight(0x67e8f9, 2.5, 8);
  pointLight1.position.set(2, 2, 2);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0xe879f9, 1.5, 8);
  pointLight2.position.set(-2, -1, 1);
  scene.add(pointLight2);

  const rimLight = new THREE.DirectionalLight(0xf0abfc, 0.8);
  rimLight.position.set(0, 3, -2);
  scene.add(rimLight);

  voiceSphereScene = { renderer, scene, camera, sphere, glowShell, mat, glowMat, pointLight1, pointLight2 };

  let t = 0;
  function animateSphere() {
    requestAnimationFrame(animateSphere);
    t += 0.025;

    const state = voiceSphereState;

    if (state === "idle") {
      // Gentle pulse
      const scale = 1 + Math.sin(t * 0.8) * 0.04;
      sphere.scale.setScalar(scale);
      glowShell.scale.setScalar(scale * 1.05);
      mat.emissiveIntensity = 0.4 + Math.sin(t * 0.8) * 0.15;
      glowMat.opacity = 0.10 + Math.sin(t * 0.8) * 0.04;
      mat.color.setHex(0x8b5cf6);
      mat.emissive.setHex(0x4a1d96);
      pointLight1.color.setHex(0x67e8f9);

    } else if (state === "listening") {
      // Faster, bigger pulse – cyan tint
      const scale = 1 + Math.sin(t * 2.2) * 0.10;
      sphere.scale.setScalar(scale);
      glowShell.scale.setScalar(scale * 1.12);
      mat.emissiveIntensity = 0.7 + Math.sin(t * 2.2) * 0.3;
      glowMat.opacity = 0.18 + Math.sin(t * 2.2) * 0.08;
      mat.color.setHex(0x38bdf8);
      mat.emissive.setHex(0x0284c7);
      pointLight1.color.setHex(0x67e8f9);
      pointLight1.intensity = 3.5 + Math.sin(t * 3) * 1;

    } else if (state === "processing") {
      // Spin + scale pulse
      sphere.rotation.y += 0.04;
      const scale = 1 + Math.sin(t * 3) * 0.06;
      sphere.scale.setScalar(scale);
      glowShell.scale.setScalar(scale * 1.08);
      mat.color.setHex(0xc084fc);
      mat.emissive.setHex(0x7c3aed);
      mat.emissiveIntensity = 0.6;
      glowMat.opacity = 0.14;
      pointLight1.intensity = 2.5;

    } else if (state === "speaking") {
      // Rapid bounce – pink/fuchsia
      const scale = 1 + Math.sin(t * 4) * 0.12;
      sphere.scale.setScalar(scale);
      glowShell.scale.setScalar(scale * 1.15);
      mat.emissiveIntensity = 0.8 + Math.sin(t * 4) * 0.35;
      glowMat.opacity = 0.22 + Math.sin(t * 4) * 0.10;
      mat.color.setHex(0xe879f9);
      mat.emissive.setHex(0xa21caf);
      pointLight2.color.setHex(0xf0abfc);
      pointLight2.intensity = 2.5 + Math.sin(t * 5) * 1.5;
    }

    // Constant slow rotation
    sphere.rotation.x += 0.003;
    if (state !== "processing") sphere.rotation.y += 0.005;

    renderer.render(scene, camera);
  }
  animateSphere();
}

function setVoiceSphereState(state) {
  voiceSphereState = state;
}

/* ═══════════════════════════════════════════════════
FEATURE 4: MOUSE PARALLAX DEPTH ON CHAT BACKGROUND
═══════════════════════════════════════════════════ */
function initParallax() {
  const layer1 = document.getElementById("bgLayer1");
  const layer2 = document.getElementById("bgLayer2");
  const section = document.getElementById("chatSection");

  if (!layer1 || !layer2 || !section) return;

  section.addEventListener("mousemove", (e) => {
    const rect = section.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const dx = (e.clientX - rect.left - cx) / cx;
    const dy = (e.clientY - rect.top - cy) / cy;

    // Layer 1: deeper layer, moves more
    const x1 = dx * 30;
    const y1 = dy * 20;
    layer1.style.transform = `translate3d(calc(-50% + ${x1}px), calc(-50% + ${y1}px), 0) scale(1.1)`;

    // Layer 2: closer layer, moves less
    const x2 = dx * 15;
    const y2 = dy * 10;
    layer2.style.transform = `translate3d(calc(-50% + ${x2}px), calc(-50% + ${y2}px), 0) scale(1.0)`;
  });

  section.addEventListener("mouseleave", () => {
    layer1.style.transform = "translate3d(-50%, -50%, 0) scale(1.1)";
    layer2.style.transform = "translate3d(-50%, -50%, 0) scale(1.0)";
  });
}

/* ═══════════════════════════════════════════════════
VOICE ASSISTANT
═══════════════════════════════════════════════════ */
const micBtn = document.getElementById("micBtn");
const voiceScreen = document.getElementById("voiceScreen");
const voiceWaves = document.getElementById("voiceWaves");
const voiceStatusTx = document.getElementById("voiceStatusText");
const voiceTranscr = document.getElementById("voiceTranscript");
const closeVoiceBtn = document.getElementById("closeVoice");

let mediaRecorder = null;
let audioChunks = [];
let isVoiceActive = false;
let currentAudio = null;

micBtn.addEventListener("click", () => {
  voiceScreen.classList.add("active");
  isVoiceActive = true;
  setVoiceState("idle");
  startVoiceListening();
});

closeVoiceBtn.addEventListener("click", stopVoiceSession);

function stopVoiceSession() {
  isVoiceActive = false;
  voiceScreen.classList.remove("active");
  stopMediaRecorder();
  stopCurrentAudio();
  setVoiceState("idle");
}

function setVoiceState(state) {
  voiceWaves.classList.remove("idle");
  setVoiceSphereState(state); // Feature 3: drive Three.js sphere

  switch (state) {
    case "idle":
      voiceWaves.classList.add("idle");
      voiceStatusTx.textContent = "Tap mic to speak";
      voiceTranscr.textContent = "";
      break;
    case "listening":
      voiceStatusTx.textContent = "Listening…";
      voiceTranscr.textContent = "";
      break;
    case "processing":
      voiceStatusTx.textContent = "Thinking…";
      voiceTranscr.textContent = "";
      break;
    case "speaking":
      voiceStatusTx.textContent = "Speaking…";
      break;
  }
}

async function startVoiceListening() {
  if (!isVoiceActive) return;
  setVoiceState("listening");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      if (!isVoiceActive) return;
      await processVoiceAudio(new Blob(audioChunks, { type: mimeType }), mimeType);
    };
    mediaRecorder.start();
    micBtn.classList.add("recording");
    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop(); micBtn.classList.remove("recording");
      }
    }, 8000);
  } catch {
    voiceStatusTx.textContent = "Mic access denied.";
    setVoiceState("idle");
  }
}

function stopMediaRecorder() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  micBtn.classList.remove("recording");
}

async function processVoiceAudio(audioBlob, mimeType) {
  if (!isVoiceActive) return;
  setVoiceState("processing");
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    const sttHeaders = await getAuthHeaders();
    const sttRes = await fetch("/stt", { method: "POST", headers: sttHeaders, body: formData });
    if (await handleUnauthorized(sttRes)) return;
    if (!sttRes.ok) throw new Error("STT failed");
    const { transcript } = await sttRes.json();
    if (!transcript?.trim()) {
      voiceStatusTx.textContent = "Didn't catch that. Try again.";
      setTimeout(() => { if (isVoiceActive) startVoiceListening(); }, 1500);
      return;
    }
    voiceTranscr.textContent = `"${transcript}"`;
    if (!currentChatId) createNewChat();
    addMessage(transcript, "user");

    const chatHeaders = await getAuthHeaders({ "Content-Type": "application/json" });
    const chatRes = await fetch("/chat", {
      method: "POST",
      headers: chatHeaders,
      body: JSON.stringify({ message: transcript })
    });
    if (await handleUnauthorized(chatRes)) return;
    if (!chatRes.ok) throw new Error("Chat failed");

    const div = document.createElement("div");
    div.className = "message bot";
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    div.appendChild(bubble);
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
    attachBubbleTilt(bubble);

    const reader = chatRes.body.getReader();
    const decoder = new TextDecoder();
    let fullReply = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      fullReply += chunk;
      bubble.textContent += chunk;
      chatBox.scrollTop = chatBox.scrollHeight;
    }
    saveCurrentChat();
    if (isVoiceActive && fullReply.trim()) await speakReply(fullReply.trim());
    if (isVoiceActive) setTimeout(() => { if (isVoiceActive) startVoiceListening(); }, 800);
  } catch {
    voiceStatusTx.textContent = "Something went wrong.";
    setTimeout(() => { if (isVoiceActive) setVoiceState("idle"); }, 2000);
  }
}

async function speakReply(text) {
  if (!isVoiceActive) return;
  setVoiceState("speaking");
  try {
    const ttsHeaders = await getAuthHeaders({ "Content-Type": "application/json" });
    const ttsRes = await fetch("/tts", {
      method: "POST",
      headers: ttsHeaders,
      body: JSON.stringify({ text })
    });
    if (await handleUnauthorized(ttsRes)) return;
    if (!ttsRes.ok) throw new Error("TTS failed");
    const { audio: audioBase64 } = await ttsRes.json();
    if (!audioBase64) return;
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
    stopCurrentAudio();
    currentAudio = new Audio(url);
    await new Promise(res => {
      currentAudio.onended = res; currentAudio.onerror = res;
      currentAudio.play().catch(res);
    });
    URL.revokeObjectURL(url);
    currentAudio = null;
  } catch {}
}

function stopCurrentAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio.src = ""; currentAudio = null; }
}

micBtn.addEventListener("dblclick", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop(); micBtn.classList.remove("recording");
  }
});