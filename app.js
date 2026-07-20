'use strict';

/* ============================== Data ============================== */

const DEFAULT_BOOKS = [
  { id: 'hooked', title: 'Hooked: How to Build Habit-Forming Products', author: 'Nir Eyal', cover: 'covers/hooked.jpg' },
  { id: 'cold-start-problem', title: 'The Cold Start Problem', author: 'Andrew Chen', cover: 'covers/cold-start-problem.jpg' },
  { id: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear', cover: 'covers/atomic-habits.jpg' },
  { id: 'creative-act', title: 'The Creative Act: A Way of Being', author: 'Rick Rubin', cover: 'covers/creative-act.jpg' },
  { id: 'inspired', title: 'Inspired: How to Create Tech Products Customers Love', author: 'Marty Cagan', cover: 'covers/inspired.jpg' },
  { id: 'build', title: 'Build: An Unorthodox Guide to Making Things Worth Making', author: 'Tony Fadell', cover: 'covers/build.jpg' },
  { id: 'user-friendly', title: 'User Friendly', author: 'Cliff Kuang', cover: 'covers/user-friendly.jpg' },
  { id: 'designing-your-life', title: 'Designing Your Life', author: 'Bill Burnett & Dave Evans', cover: 'covers/designing-your-life.jpg' },
  { id: 'indistractable', title: 'Indistractable: How to Control Your Attention', author: 'Nir Eyal', cover: 'covers/indistractable.jpg' },
];

const STORAGE_KEY = 'digital-library-custom-books';

function loadCustomBooks() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCustomBooks() {
  const custom = books.filter((b) => b.custom);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch (e) {
    console.warn('Could not persist books (storage full?)', e);
  }
}

let books = [...DEFAULT_BOOKS, ...loadCustomBooks()];

/* Position along the shelf. It counts slots, not books, and is deliberately
   unbounded — the book on screen is slotCursor modulo books.length. */
let slotCursor = Math.max(0, books.findIndex((b) => b.id === 'inspired'));

/* ============================== Cover Flow ============================== */

const coverflowEl = document.getElementById('coverflow');
const bookTitleEl = document.getElementById('bookTitle');
const bookAuthorEl = document.getElementById('bookAuthor');

/* Bump when the cover art in covers/ is replaced, so browsers don't
   keep serving a stale low-resolution copy. */
const COVER_VERSION = '2';

function coverSrc(book) {
  // Captured/uploaded covers are data URLs — leave those alone.
  return book.cover.startsWith('data:') ? book.cover : `${book.cover}?v=${COVER_VERSION}`;
}

/* How many slots the shelf renders. Always a whole number of copies of the
   library, so every slot maps cleanly onto a book. */
let slotCount = 0;

function currentBookIndex() {
  const n = books.length;
  return ((slotCursor % n) + n) % n;
}

/* Spacing, plus the first offset that sits entirely past the edge of the
   screen — that is where covers can be recycled unseen. */
function shelfMetrics() {
  const isNarrow = window.innerWidth < 900;

  // Measured from a rendered cover rather than the --cover-w custom property:
  // getPropertyValue hands back the unresolved token string, which no longer
  // parses now that the width is a min()/calc() expression.
  let probe = coverflowEl.querySelector('.book');
  const temporary = !probe;
  if (temporary) {
    probe = document.createElement('div');
    probe.className = 'book';
    probe.style.visibility = 'hidden';
    coverflowEl.appendChild(probe);
  }
  const coverW = probe.offsetWidth || 255;
  if (temporary) probe.remove();

  const firstOffset = coverW * (isNarrow ? 0.68 : 0.95);
  const step = coverW * (isNarrow ? 0.28 : 0.335);

  const edge = window.innerWidth / 2 + coverW / 2;
  let offscreen = 1;
  while (firstOffset + (offscreen - 1) * step <= edge && offscreen < 60) offscreen++;

  return { coverW, firstOffset, step, offscreen };
}

/* Shortest signed distance around the shelf. */
function wrapOffset(d) {
  const t = slotCount;
  let o = ((d % t) + t) % t;
  if (o > t / 2) o -= t;
  return o;
}

function buildCoverflow() {
  const n = books.length;
  const { offscreen } = shelfMetrics();
  // Enough whole copies of the library to fill the screen and still leave
  // hidden slots either side for recycling.
  const copies = Math.max(1, Math.ceil((2 * offscreen + 1) / n));
  slotCount = n * copies;

  coverflowEl.innerHTML = '';
  for (let slot = 0; slot < slotCount; slot++) {
    const book = books[slot % n];
    const el = document.createElement('div');
    el.className = 'book';
    el.dataset.slot = slot;

    const src = coverSrc(book);

    const cover = document.createElement('img');
    cover.className = 'cover';
    cover.src = src;
    cover.alt = book.title;
    cover.draggable = false;

    const reflection = document.createElement('img');
    reflection.className = 'reflection';
    reflection.src = src;
    reflection.alt = '';
    reflection.setAttribute('aria-hidden', 'true');
    reflection.draggable = false;

    el.appendChild(cover);
    el.appendChild(reflection);
    el.addEventListener('click', () => goToSlot(slot));
    coverflowEl.appendChild(el);
  }
  layout();
}

function layout() {
  const { firstOffset, step, offscreen } = shelfMetrics();
  const sideAngle = 42;

  coverflowEl.querySelectorAll('.book').forEach((el) => {
    const offset = wrapOffset(Number(el.dataset.slot) - slotCursor);
    const abs = Math.abs(offset);
    const dir = Math.sign(offset);

    // A cover recycling from one end of the shelf to the other must not slide
    // across the middle — snap it. This only ever happens off-screen.
    const prev = el.dataset.off;
    if (prev !== undefined && Math.abs(offset - Number(prev)) > slotCount / 2) {
      el.style.transition = 'none';
      requestAnimationFrame(() => { el.style.transition = ''; });
    }
    el.dataset.off = offset;

    if (offset === 0) {
      el.style.transform = 'translateX(0) translateZ(160px) rotateY(0deg)';
      el.style.zIndex = 100;
      el.style.pointerEvents = 'auto';
    } else {
      const x = dir * (firstOffset + (abs - 1) * step);
      el.style.transform =
        `translateX(${x}px) translateZ(-60px) rotateY(${-dir * sideAngle}deg) scaleY(0.97)`;
      el.style.zIndex = 100 - abs;
      el.style.pointerEvents = abs > offscreen ? 'none' : 'auto';
    }
  });

  const book = books[currentBookIndex()];
  bookTitleEl.textContent = book.title;
  bookAuthorEl.textContent = book.author;
}

function setCursor(c) {
  slotCursor = c;
  layout();
}

/* Move by whole positions along the shelf. */
function nudge(delta) {
  setCursor(slotCursor + delta);
}

/* Bring a specific rendered slot to the centre, travelling the short way. */
function goToSlot(slot) {
  const delta = wrapOffset(slot - slotCursor);
  if (delta !== 0) setCursor(slotCursor + delta);
}

/* Bring a specific book to the centre, travelling the short way. */
function selectBook(bookIndex) {
  const n = books.length;
  let delta = (((bookIndex - currentBookIndex()) % n) + n) % n;
  if (delta > n / 2) delta -= n;
  setCursor(slotCursor + delta);
}

/* Keyboard */
document.addEventListener('keydown', (e) => {
  if (!modalBackdrop.hidden) return;
  if (currentView !== 'cover') return;
  if (e.target.tagName === 'INPUT') return; // don't hijack arrows while typing
  if (e.key === 'ArrowLeft') nudge(-1);
  if (e.key === 'ArrowRight') nudge(1);
});

/* Wheel / trackpad */
let wheelAccum = 0;
let wheelLock = false;
document.getElementById('stage').addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    if (wheelLock) return;
    wheelAccum += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(wheelAccum) > 60) {
      nudge(Math.sign(wheelAccum));
      wheelAccum = 0;
      wheelLock = true;
      setTimeout(() => (wheelLock = false), 250);
    }
  },
  { passive: false }
);

/* Drag / swipe */
let dragStartX = null;
let dragStartIndex = 0;
const stage = document.getElementById('stage');

stage.addEventListener('pointerdown', (e) => {
  dragStartX = e.clientX;
  dragStartIndex = slotCursor;
});
stage.addEventListener('pointermove', (e) => {
  if (dragStartX === null) return;
  const moved = Math.round((dragStartX - e.clientX) / 90);
  if (moved !== 0) setCursor(dragStartIndex + moved);
});
stage.addEventListener('pointerup', () => (dragStartX = null));
stage.addEventListener('pointercancel', () => (dragStartX = null));

/* A wider window needs more slots before recycling is safely out of sight. */
window.addEventListener('resize', () => {
  const { offscreen } = shelfMetrics();
  const needed = books.length * Math.max(1, Math.ceil((2 * offscreen + 1) / books.length));
  if (needed !== slotCount) buildCoverflow();
  else layout();
});

/* ============================== Views, tabs & search ============================== */

const stageEl = document.getElementById('stage');
const browseEl = document.getElementById('browse');
const browseInner = document.getElementById('browseInner');
const browseEmpty = document.getElementById('browseEmpty');
const searchInput = document.getElementById('searchInput');

let currentView = 'cover';

/* Books matching the current search, or all of them when the box is empty. */
function visibleBooks() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) return books;
  return books.filter(
    (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
  );
}

function renderBrowse() {
  const list = visibleBooks();
  browseInner.className = `browse-inner ${currentView}`;
  browseInner.innerHTML = '';
  browseEmpty.hidden = list.length > 0;

  list.forEach((book) => {
    const item = document.createElement('div');
    item.className = 'browse-item';

    const img = document.createElement('img');
    img.src = coverSrc(book);
    img.alt = book.title;
    img.loading = 'lazy';

    const title = document.createElement('h3');
    title.textContent = book.title;

    const author = document.createElement('p');
    author.textContent = book.author;

    const text = document.createElement('div');
    text.append(title, author);

    item.append(img, text);
    // Jump to this book in the cover flow
    item.addEventListener('click', () => {
      selectBook(books.indexOf(book));
      setView('cover');
    });
    browseInner.appendChild(item);
  });
}

function setView(view) {
  currentView = view;
  document.querySelectorAll('.view-cta').forEach((btn) => {
    const on = btn.dataset.view === view;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  });

  const isCover = view === 'cover';
  stageEl.hidden = !isCover;
  browseEl.hidden = isCover;
  if (isCover) layout();
  else renderBrowse();
}

document.getElementById('viewCtas').addEventListener('click', (e) => {
  const btn = e.target.closest('.view-cta');
  if (btn) setView(btn.dataset.view);
});

document.getElementById('tabsNav').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-link');
  if (!btn) return;
  document.querySelectorAll('.tab-link').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
});

/* In cover view, searching jumps to the first match; elsewhere it filters. */
searchInput.addEventListener('input', () => {
  if (currentView === 'cover') {
    const match = visibleBooks()[0];
    if (match && searchInput.value.trim()) selectBook(books.indexOf(match));
  } else {
    renderBrowse();
  }
});

/* ============================== Add-book modal ============================== */

const modalBackdrop = document.getElementById('modalBackdrop');
const addBtn = document.getElementById('addBtn');
const modalClose = document.getElementById('modalClose');
const tabScan = document.getElementById('tabScan');
const tabPhoto = document.getElementById('tabPhoto');
const cameraWrap = document.getElementById('cameraWrap');
const cameraNote = document.getElementById('cameraNote');
const cameraFallback = document.getElementById('cameraFallback');
const fileInput = document.getElementById('fileInput');
const camVideo = document.getElementById('camVideo');
const scanActions = document.getElementById('scanActions');
const photoActions = document.getElementById('photoActions');
const captureBtn = document.getElementById('captureBtn');
const isbnInput = document.getElementById('isbnInput');
const isbnLookupBtn = document.getElementById('isbnLookupBtn');
const modalStatus = document.getElementById('modalStatus');
const confirmCard = document.getElementById('confirmCard');
const confirmCover = document.getElementById('confirmCover');
const confirmTitle = document.getElementById('confirmTitle');
const confirmAuthor = document.getElementById('confirmAuthor');
const confirmAddBtn = document.getElementById('confirmAddBtn');
const retryBtn = document.getElementById('retryBtn');
const captureCanvas = document.getElementById('captureCanvas');

let mode = 'scan'; // 'scan' | 'photo'
let mediaStream = null;
let scanTimer = null;
let barcodeDetector = null;
let pendingCoverSrc = null;

function setStatus(msg, isError = false) {
  modalStatus.hidden = !msg;
  modalStatus.textContent = msg || '';
  modalStatus.classList.toggle('error', isError);
}

function setMode(next) {
  mode = next;
  tabScan.classList.toggle('active', mode === 'scan');
  tabScan.setAttribute('aria-selected', String(mode === 'scan'));
  tabPhoto.classList.toggle('active', mode === 'photo');
  tabPhoto.setAttribute('aria-selected', String(mode === 'photo'));
  scanActions.hidden = mode !== 'scan';
  photoActions.hidden = mode !== 'photo';
  cameraWrap.classList.toggle('photo-mode', mode === 'photo');
  cameraNote.textContent =
    mode === 'scan'
      ? 'Point the camera at the barcode on the back of the book.'
      : 'Line up the front cover inside the frame.';
  hideConfirm();
  setStatus('');
  if (mode === 'scan') startBarcodeLoop();
  else stopBarcodeLoop();
}

tabScan.addEventListener('click', () => setMode('scan'));
tabPhoto.addEventListener('click', () => setMode('photo'));

async function openModal() {
  modalBackdrop.hidden = false;
  hideConfirm();
  setStatus('');
  isbnInput.value = '';
  await startCamera();
  setMode('scan');
}

function closeModal() {
  modalBackdrop.hidden = true;
  stopBarcodeLoop();
  stopCamera();
}

addBtn.addEventListener('click', openModal);
modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) closeModal();
});

/* ---------- Camera ---------- */

async function startCamera() {
  stopCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraFallback();
    return;
  }
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 } },
      audio: false,
    });
    camVideo.srcObject = mediaStream;
    cameraWrap.hidden = false;
    cameraFallback.hidden = true;
  } catch (err) {
    console.warn('Camera failed:', err);
    showCameraFallback();
  }
}

function showCameraFallback() {
  cameraWrap.hidden = true;
  cameraFallback.hidden = false;
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((t) => t.stop());
    mediaStream = null;
  }
  camVideo.srcObject = null;
}

/* Grab the current video frame; in photo mode crop to book-cover proportions */
function grabFrame({ cropPortrait = false } = {}) {
  const vw = camVideo.videoWidth;
  const vh = camVideo.videoHeight;
  if (!vw || !vh) return null;

  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (cropPortrait) {
    // Match the on-screen guide frame: a centered portrait region (~0.68 aspect)
    const targetAspect = 0.68;
    sh = vh * 0.92;
    sw = sh * targetAspect;
    if (sw > vw) { sw = vw; sh = sw / targetAspect; }
    sx = (vw - sw) / 2;
    sy = (vh - sh) / 2;
  }

  const outW = cropPortrait ? 400 : Math.min(vw, 1024);
  const outH = cropPortrait ? Math.round(400 / 0.68) : Math.round(outW * (sh / sw));
  captureCanvas.width = outW;
  captureCanvas.height = outH;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(camVideo, sx, sy, sw, sh, 0, 0, outW, outH);
  return captureCanvas;
}

/* ---------- Barcode scanning (ISBN) ---------- */

async function getBarcodeDetector() {
  if (barcodeDetector) return barcodeDetector;
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      const wanted = ['ean_13', 'ean_8', 'upc_a'].filter((f) => formats.includes(f));
      if (wanted.length) {
        barcodeDetector = new window.BarcodeDetector({ formats: wanted });
        return barcodeDetector;
      }
    } catch { /* fall through */ }
  }
  return null;
}

function startBarcodeLoop() {
  stopBarcodeLoop();
  scanTimer = setInterval(async () => {
    if (!mediaStream || !modalBackdrop || modalBackdrop.hidden || !confirmCard.hidden) return;
    const detector = await getBarcodeDetector();
    if (!detector) {
      stopBarcodeLoop();
      setStatus('Live barcode scanning is not supported in this browser — type the ISBN below.');
      return;
    }
    try {
      const codes = await detector.detect(camVideo);
      const isbn = codes.map((c) => c.rawValue).find((v) => /^97[89]\d{10}$/.test(v));
      if (isbn) {
        stopBarcodeLoop();
        await lookupAndConfirm(isbn);
      }
    } catch { /* frame not ready yet */ }
  }, 350);
}

function stopBarcodeLoop() {
  if (scanTimer) {
    clearInterval(scanTimer);
    scanTimer = null;
  }
}

/* ---------- Open Library lookup ---------- */

async function lookupAndConfirm(isbn) {
  setStatus(`Found ISBN ${isbn} — looking it up…`);
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`);
    if (!res.ok) throw new Error(`No record for ISBN ${isbn}`);
    const data = await res.json();

    let author = '';
    if (data.authors?.[0]?.key) {
      try {
        const a = await fetch(`https://openlibrary.org${data.authors[0].key}.json`).then((r) => r.json());
        author = a.name || '';
      } catch { /* author optional */ }
    }

    const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
    showConfirm({ title: data.title || '', author, coverSrc: coverUrl });
    setStatus('');
  } catch (err) {
    console.warn(err);
    setStatus(`Couldn't find ISBN ${isbn} on Open Library. Try again or use a photo of the cover.`, true);
    if (mode === 'scan') startBarcodeLoop();
  }
}

isbnLookupBtn.addEventListener('click', () => {
  const isbn = isbnInput.value.replace(/[-\s]/g, '');
  if (!/^(97[89]\d{10}|\d{9}[\dXx])$/.test(isbn)) {
    setStatus('That does not look like a valid ISBN (10 or 13 digits).', true);
    return;
  }
  stopBarcodeLoop();
  lookupAndConfirm(isbn);
});
isbnInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') isbnLookupBtn.click();
});

/* ---------- Photo capture ---------- */

captureBtn.addEventListener('click', () => {
  const canvas = grabFrame({ cropPortrait: true });
  if (!canvas) {
    setStatus('Camera is not ready yet — give it a second.', true);
    return;
  }
  showConfirm({
    title: '',
    author: '',
    coverSrc: canvas.toDataURL('image/jpeg', 0.85),
    needsTitle: true,
  });
});

/* File-upload fallback: try to read a barcode from it, else use it as the cover */
fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  setStatus('Reading photo…');
  const bitmap = await createImageBitmap(file);

  const detector = await getBarcodeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(bitmap);
      const isbn = codes.map((c) => c.rawValue).find((v) => /^97[89]\d{10}$/.test(v));
      if (isbn) {
        await lookupAndConfirm(isbn);
        return;
      }
    } catch { /* fall through to cover mode */ }
  }

  // No barcode found — use the photo as the cover
  const scale = Math.min(1, 500 / bitmap.width);
  captureCanvas.width = Math.round(bitmap.width * scale);
  captureCanvas.height = Math.round(bitmap.height * scale);
  captureCanvas.getContext('2d').drawImage(bitmap, 0, 0, captureCanvas.width, captureCanvas.height);
  showConfirm({
    title: '',
    author: '',
    coverSrc: captureCanvas.toDataURL('image/jpeg', 0.85),
    needsTitle: true,
  });
});

/* ---------- Confirm & add ---------- */

function showConfirm({ title, author, coverSrc, needsTitle = false }) {
  pendingCoverSrc = coverSrc;
  confirmCover.src = coverSrc;
  confirmTitle.value = title;
  confirmAuthor.value = author;
  confirmCard.hidden = false;
  setStatus(needsTitle ? 'Add the title (and author) so the book is searchable.' : '');
  if (needsTitle) confirmTitle.focus();
}

function hideConfirm() {
  confirmCard.hidden = true;
  pendingCoverSrc = null;
}

retryBtn.addEventListener('click', () => {
  hideConfirm();
  setStatus('');
  if (mode === 'scan') startBarcodeLoop();
});

confirmAddBtn.addEventListener('click', () => {
  const title = confirmTitle.value.trim();
  if (!title) {
    setStatus('A title is required.', true);
    confirmTitle.focus();
    return;
  }
  books.push({
    id: `custom-${Date.now()}`,
    title,
    author: confirmAuthor.value.trim(),
    cover: pendingCoverSrc,
    custom: true,
  });
  saveCustomBooks();
  buildCoverflow();
  selectBook(books.length - 1);
  if (currentView !== 'cover') renderBrowse();
  closeModal();
});

/* ============================== Viewport lock ============================== */

/* iOS Safari ignores user-scalable=no, so pinch and double-tap zoom have to be
   refused directly. Single-finger gestures are left alone so the shelf can still
   be dragged and the list still scrolled. */
['gesturestart', 'gesturechange', 'gestureend'].forEach((type) => {
  document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
});

document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false }
);

/* ============================== Init ============================== */

buildCoverflow();
