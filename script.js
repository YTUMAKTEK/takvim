/************ CONFIG *************/
const EDIT_PASSWORD = "1324"; // 🔐 change me
const WEEKS = 16;

/* Start date rule:
   If today is on/after Sept 29 -> use this year's Sept 29
   else use last year's Sept 29
*/
const START_DATE = new Date(2025, 8, 29);


function pad2(n) { return String(n).padStart(2, "0"); }
function formatDMY(date) {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}
  
// helper: go back to Monday of the week containing `d`
// 
function startOfWeekMonday(d){
    const res = new Date(d);
    const diff = (res.getDay() + 6) % 7; // 0=Sun -> 6; 1=Mon -> 0; ... 6=Sat -> 5
    res.setDate(res.getDate() - diff);
    res.setHours(0,0,0,0);
    return res;
  }
  
  document.getElementById('copyLink')?.addEventListener('click', async () => {
    // Make sure URL reflects the latest data
    writeDataToUrl(loadAll());
    const url = location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Takvim', url });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(url); alert('Link copied!'); }
      else { prompt('Copy this link:', url); }
    } catch {}
  });
  

/************ STORAGE *************/
/* ===== URL ENCODE/DECODE (base64url) ===== */
window.addEventListener('popstate', () => {
    const data = readDataFromUrl();
    if (!data) return;
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    days.forEach(d => renderDay(d.date)); // re-render tiles
  });
  
function toBase64Url(str){
    const b64 = btoa(unescape(encodeURIComponent(str)));
    return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function fromBase64Url(b64u){
    let b64 = b64u.replace(/-/g,'+').replace(/_/g,'/');
    b64 += '=='.slice(0, (4 - (b64.length % 4)) % 4);
    return decodeURIComponent(escape(atob(b64)));
  }
  
  /* read data from ?d=... or #d=... */
  function readDataFromUrl(){
    const u = new URL(location.href);
    const q = u.searchParams.get('d');
    if (q) { try { return JSON.parse(fromBase64Url(q)); } catch { return null; } }
  
    const m = location.hash.match(/(?:#|\?)d=([^&]+)/);
    if (m) { try { return JSON.parse(fromBase64Url(m[1])); } catch { return null; } }
  
    return null;
  }
  
  /* write data to the URL as ?d=... (and clear old hash) */
  function writeDataToUrl(data){
    const u = new URL(location.href);
    u.searchParams.set('d', toBase64Url(JSON.stringify(data)));
    u.hash = ''; // drop any old #d=...
    history.replaceState(null, '', u.toString());
  }
  
  
const LS_KEY = "club_calendar_v1";
function loadAll() {
  // First try to load from URL parameters
  const urlData = readDataFromUrl();
  if (urlData) {
    return urlData;
  }
  
  // Fall back to localStorage
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveAll(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
  writeDataToUrl(data); // keeps the address bar shareable
}
function keyForDate(d) {
  return d.toISOString().slice(0, 10);
}

/************ SHARE FUNCTIONALITY *************/
const shareBtn = document.getElementById("shareBtn");

shareBtn.addEventListener("click", async () => {
  const currentUrl = window.location.href;
  
  try {
    // Try to use the modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(currentUrl);
      showShareFeedback("Link copied to clipboard!");
    } else {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = currentUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showShareFeedback("Link copied to clipboard!");
    }
  } catch (err) {
    // If clipboard API fails, show the URL in a prompt
    prompt("Copy this link to share your calendar:", currentUrl);
  }
});

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
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(feedback);
  
  setTimeout(() => {
    feedback.style.animation = "slideOut 0.3s ease";
    setTimeout(() => document.body.removeChild(feedback), 300);
  }, 2000);
}

// Add CSS for the feedback animation
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

const weekdays = ["Pzt","Salı","Çarş","Perş","Cuma","Cmt","Pzr"];

const GRID_START = startOfWeekMonday(START_DATE);
const allData = loadAll();
const days = []; // keep refs {el, date}

for (let i = 0; i < WEEKS * 7; i++) {
    const date = new Date(GRID_START);
    date.setDate(GRID_START.getDate() + i);
  
    const tile = document.createElement("div");
    tile.className = "day";
    tile.tabIndex = 0;
  
    // weekday label inside the tile (auto locale)
    const header = document.createElement("div");
    header.className = "day-header";
    const left = document.createElement("div");
    left.textContent = date.toLocaleString(undefined, { weekday: "short" }); // "Mon", "Tue", ...
    const right = document.createElement("div");
    right.innerHTML = `<span class="day-num">${formatDMY(date)}</span>`;
    header.append(left, right);
  
    const evWrap = document.createElement("div");
    evWrap.className = "day-events";
    tile.append(header, evWrap);
    grid.appendChild(tile);
  
    tile.addEventListener("click", () => openModal(date));
  
    days.push({ el: tile, eventsEl: evWrap, date });
    renderDay(date);
  }


/************ RENDER A DAY'S EVENTS *************/
function renderDay(date) {
  const key = keyForDate(date);
  const list = (loadAll()[key] || []).slice().sort((a,b) => timeToMin(a.start) - timeToMin(b.start));

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

function timeToMin(t) { // "HH:MM" -> minutes since 0:00
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

function openModal(date) {
  currentDateKey = keyForDate(date);
  modalDate.textContent = formatPretty(date);
  editDate.textContent = formatPretty(date);
  pwError.classList.add("hidden");
  pwInput.value = "";

  // view list
  renderViewList();

  // show password step
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

pwSubmit.addEventListener("click", () => {
  if (pwInput.value === EDIT_PASSWORD) {
    pwError.classList.add("hidden");
    pwStep.classList.add("hidden");
    editStep.classList.remove("hidden");
    renderEditList();
  } else {
    pwError.classList.remove("hidden");
  }
});

function renderViewList() {
  const list = (loadAll()[currentDateKey] || []).slice().sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  viewList.innerHTML = list.length ? "" : `<div class="muted">No events yet.</div>`;
  for (const ev of list) {
    const row = document.createElement("div");
    row.className = "event-row";
    row.style.background = colorWithAlpha(ev.color, .12);
    row.style.borderLeftColor = ev.color;

    const dot = document.createElement("span");
    dot.className = "dot"; dot.style.background = ev.color;

    const times = document.createElement("span");
    times.className = "times"; times.textContent = `${ev.start}-${ev.end}`;

    const desc = document.createElement("span");
    desc.className = "desc"; desc.textContent = ev.desc;

    row.append(dot, times, desc);
    viewList.appendChild(row);
  }
}

function renderEditList() {
  const data = loadAll();
  const list = (data[currentDateKey] || []).slice().sort((a,b)=>timeToMin(a.start)-timeToMin(b.start));
  editList.innerHTML = list.length ? "" : `<div class="muted">No events yet. Add one above.</div>`;

  list.forEach((ev, idx) => {
    const row = document.createElement("div");
    row.className = "event-row";
    row.style.background = colorWithAlpha(ev.color, .12);
    row.style.borderLeftColor = ev.color;

    const dot = document.createElement("span");
    dot.className = "dot"; dot.style.background = ev.color;

    const times = document.createElement("span");
    times.className = "times"; times.textContent = `${ev.start}-${ev.end}`;

    const desc = document.createElement("span");
    desc.className = "desc"; desc.textContent = ev.desc;

    const del = document.createElement("button");
    del.className = "delete"; del.textContent = "Delete";
    del.addEventListener("click", () => {
      const fresh = loadAll();
      const arr = (fresh[currentDateKey] || []);
      arr.splice(idx, 1);
      fresh[currentDateKey] = arr;
      saveAll(fresh);
      renderEditList();
      renderDay(new Date(currentDateKey));
    });

    row.append(dot, times, desc, del);
    editList.appendChild(row);
  });
}

eventForm.addEventListener("submit", (e) => {
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

  const data = loadAll();
  const arr = data[currentDateKey] || [];
  arr.push({ color, start, end, desc });
  data[currentDateKey] = arr;
  saveAll(data);

  // clear desc only
  document.getElementById("evDesc").value = "";
  renderEditList();
  renderDay(new Date(currentDateKey));
});

doneEdit.addEventListener("click", () => {
  closeModal();
});

/************ HELPERS *************/
function colorWithAlpha(hex, alpha) {
  const {r,g,b} = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
function hexToRgb(hex) {
  let h = hex.replace("#","");
  if (h.length === 3) h = h.split("").map(c=>c+c).join("");
  const n = parseInt(h,16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function formatPretty(date) {
  const opts = { weekday:"long", year:"numeric", month:"long", day:"numeric" };
  return date.toLocaleDateString(undefined, opts);
}
