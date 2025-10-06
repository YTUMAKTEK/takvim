/************ CONFIG *************/
const EDIT_PASSWORD = "1324"; // 🔐 change me
const WEEKS = 16;
const START_DATE = new Date(2025, 8, 29);

// Firebase Configuration - REPLACE WITH YOUR VALUES
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCTudHp720hzHpJhQrUkZv9TzR-5jUc_fk",
  authDomain: "takvim-56088.firebaseapp.com",
  databaseURL: "https://takvim-56088-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "takvim-56088",
  storageBucket: "takvim-56088.firebasestorage.app",
  messagingSenderId: "89997881841",
  appId: "1:89997881841:web:fac711d8413e4f9a345450",
  measurementId: "G-GK7547FY4B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
/************ FIREBASE SETUP *************/
let db = null;
let calendarId = null;
let dataRef = null;

// Initialize Firebase
async function initFirebase() {
  try {
    const app = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    
    // Get or create calendar ID
    const urlParams = new URLSearchParams(window.location.search);
    calendarId = urlParams.get('cal');
    
    if (!calendarId) {
      // Generate new calendar ID
      calendarId = generateCalendarId();
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('cal', calendarId);
      window.history.replaceState({}, '', newUrl);
    }
    
    dataRef = db.ref('calendars/' + calendarId);
    
    // Listen for changes from other users
    dataRef.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      // Update UI when data changes
      days.forEach(d => renderDay(d.date));
    });
    
    console.log('✅ Firebase connected! Calendar ID:', calendarId);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    alert('Failed to connect to Firebase. Check your configuration.');
  }
}

function generateCalendarId() {
  return 'cal_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

/************ STORAGE (Firebase-based) *************/
async function loadAll() {
  if (!dataRef) return {};
  try {
    const snapshot = await dataRef.once('value');
    return snapshot.val() || {};
  } catch (error) {
    console.error('Error loading data:', error);
    return {};
  }
}

async function saveAll(data) {
  if (!dataRef) return;
  try {
    await dataRef.set(data);
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Failed to save. Please try again.');
  }
}

/************ HELPER FUNCTIONS *************/
function pad2(n) { return String(n).padStart(2, "0"); }

function formatDMY(date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function startOfWeekMonday(d) {
  const res = new Date(d);
  const diff = (res.getDay() + 6) % 7;
  res.setDate(res.getDate() - diff);
  res.setHours(0, 0, 0, 0);
  return res;
}

function keyForDate(d) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

/************ SHARE FUNCTIONALITY *************/
async function shareOrCopyCurrentUrl() {
  const currentUrl = location.href;
  
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Takvim', url: currentUrl });
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentUrl);
      showShareFeedback("Link copied to clipboard!");
      return;
    }
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = currentUrl;
    ta.style.position = 'fixed';
    ta.style.left = '-99999px';
    ta.style.top = '-99999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showShareFeedback("Link copied to clipboard!");
  } catch {
    prompt("Copy this link:", currentUrl);
  }
}

function showShareFeedback(message) {
  const feedback = document.createElement("div");
  feedback.textContent = message;
  feedback.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #27ae60;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(feedback);
  setTimeout(() => {
    feedback.style.transition = "opacity .25s ease";
    feedback.style.opacity = "0";
    setTimeout(() => feedback.remove(), 250);
  }, 1800);
}

// Add CSS for animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);

/************ RENDER CALENDAR *************/
const cal = document.getElementById("calendar");
const grid = document.createElement("div");
grid.className = "calendar-grid";
cal.appendChild(grid);

const GRID_START = startOfWeekMonday(START_DATE);
const days = [];

async function initCalendar() {
  await initFirebase();
  
  for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(GRID_START);
    date.setDate(GRID_START.getDate() + i);
    
    const tile = document.createElement("div");
    tile.className = "day";
    tile.tabIndex = 0;
    
    const header = document.createElement("div");
    header.className = "day-header";
    const left = document.createElement("div");
    left.textContent = date.toLocaleString(undefined, { weekday: "short" });
    const right = document.createElement("div");
    right.innerHTML = `<span class="day-num">${formatDMY(date)}</span>`;
    header.append(left, right);
    
    const evWrap = document.createElement("div");
    evWrap.className = "day-events";
    tile.append(header, evWrap);
    grid.appendChild(tile);
    
    tile.addEventListener("click", () => openModal(date));
    
    days.push({ el: tile, eventsEl: evWrap, date });
    await renderDay(date);
  }
  
  // Setup share buttons
  const copyLinkBtn = document.getElementById('copyLink');
  if (copyLinkBtn) copyLinkBtn.addEventListener('click', shareOrCopyCurrentUrl);
  
  const shareBtn = document.getElementById('shareBtn');
  if (shareBtn) shareBtn.addEventListener('click', shareOrCopyCurrentUrl);
}

// Start the app
initCalendar();

/************ RENDER A DAY'S EVENTS *************/
async function renderDay(date) {
  const key = keyForDate(date);
  const allData = await loadAll();
  const list = (allData[key] || []).slice().sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  
  const day = days.find(d => keyForDate(d.date) === key);
  if (!day) return;
  
  day.eventsEl.innerHTML = "";
  for (const ev of list) {
    const chip = document.createElement("div");
    chip.className = "event-chip";
    
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = ev.color;
    
    const text = document.createElement("span");
    text.className = "ev-text";
    text.textContent = `${ev.start}-${ev.end}  ${ev.desc}`;
    
    chip.style.background = colorWithAlpha(ev.color, 0.18);
    chip.style.borderLeftColor = ev.color;
    chip.append(dot, text);
    day.eventsEl.appendChild(chip);
  }
}

function timeToMin(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/************ MODAL (password + editor) *************/
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");
const pwStep = document.getElementById("pwStep");
const editStep = document.getElementById("editStep");
const modalDate = document.getElementById("modalDate");
const editDate = document.getElementById("editDate");
const pwInput = document.getElementById("pwInput");
const pwSubmit = document.getElementById("pwSubmit");
const pwError = document.getElementById("pwError");
const viewList = document.getElementById("viewList");
const editList = document.getElementById("editList");
const eventForm = document.getElementById("eventForm");
const doneEdit = document.getElementById("doneEdit");

let currentDateKey = null;

async function openModal(date) {
  currentDateKey = keyForDate(date);
  modalDate.textContent = formatPretty(date);
  editDate.textContent = formatPretty(date);
  pwError.classList.add("hidden");
  pwInput.value = "";
  
  await renderViewList();
  
  pwStep.classList.remove("hidden");
  editStep.classList.add("hidden");
  
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

modalClose.addEventListener("click", closeModal);
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

pwSubmit.addEventListener("click", async () => {
  if (pwInput.value === EDIT_PASSWORD) {
    pwError.classList.add("hidden");
    pwStep.classList.add("hidden");
    editStep.classList.remove("hidden");
    await renderEditList();
  } else {
    pwError.classList.remove("hidden");
  }
});

async function renderViewList() {
  const allData = await loadAll();
  const list = (allData[currentDateKey] || []).slice().sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  viewList.innerHTML = list.length ? "" : `<div class="muted">No events yet.</div>`;
  for (const ev of list) {
    const row = document.createElement("div");
    row.className = "event-row";
    row.style.background = colorWithAlpha(ev.color, .12);
    row.style.borderLeftColor = ev.color;
    
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = ev.color;
    
    const times = document.createElement("span");
    times.className = "times";
    times.textContent = `${ev.start}-${ev.end}`;
    
    const desc = document.createElement("span");
    desc.className = "desc";
    desc.textContent = ev.desc;
    
    row.append(dot, times, desc);
    viewList.appendChild(row);
  }
}

async function renderEditList() {
  const data = await loadAll();
  const list = (data[currentDateKey] || []).slice().sort((a, b) => timeToMin(a.start) - timeToMin(b.start));
  editList.innerHTML = list.length ? "" : `<div class="muted">No events yet. Add one above.</div>`;
  
  list.forEach((ev, idx) => {
    const row = document.createElement("div");
    row.className = "event-row";
    row.style.background = colorWithAlpha(ev.color, .12);
    row.style.borderLeftColor = ev.color;
    
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = ev.color;
    
    const times = document.createElement("span");
    times.className = "times";
    times.textContent = `${ev.start}-${ev.end}`;
    
    const desc = document.createElement("span");
    desc.className = "desc";
    desc.textContent = ev.desc;
    
    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "Delete";
    del.addEventListener("click", async () => {
      const fresh = await loadAll();
      const arr = (fresh[currentDateKey] || []);
      arr.splice(idx, 1);
      fresh[currentDateKey] = arr;
      await saveAll(fresh);
      await renderEditList();
      await renderDay(new Date(currentDateKey));
    });
    
    row.append(dot, times, desc, del);
    editList.appendChild(row);
  });
}

eventForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const color = document.getElementById("evColor").value || "#27ae60";
  const start = document.getElementById("evStart").value;
  const end = document.getElementById("evEnd").value;
  const desc = document.getElementById("evDesc").value.trim();
  
  if (!start || !end || !desc) return;
  
  if (timeToMin(end) < timeToMin(start)) {
    alert("End time must be after start time.");
    return;
  }
  
  const data = await loadAll();
  const arr = data[currentDateKey] || [];
  arr.push({ color, start, end, desc });
  data[currentDateKey] = arr;
  await saveAll(data);
  
  document.getElementById("evDesc").value = "";
  await renderEditList();
  await renderDay(new Date(currentDateKey));
});

doneEdit.addEventListener("click", () => {
  closeModal();
});

/************ HELPERS *************/
function colorWithAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function formatPretty(date) {
  const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString(undefined, opts);
}