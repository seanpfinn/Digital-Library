'use strict';

/* ============================== Data ============================== */

const DEFAULT_BOOKS = [
  {
    id: 'hooked',
    title: 'Hooked: How to Build Habit-Forming Products',
    author: 'Nir Eyal',
    cover: 'covers/hooked.jpg',
    synopsis:
      'Eyal lays out the Hook Model — trigger, action, variable reward, investment — a four-step cycle that explains why some products become part of daily routine while others are opened once and forgotten. Equal parts behavioural psychology and practical playbook, with a closing chapter on the ethics of designing for habit.',
  },
  {
    id: 'cold-start-problem',
    title: 'The Cold Start Problem',
    author: 'Andrew Chen',
    cover: 'covers/cold-start-problem.jpg',
    synopsis:
      'Network products are worthless until enough people use them — so how does anyone get past the empty room? Drawing on his time at Uber and a16z, Chen argues for building small "atomic networks" that work on their own, then charting the path through tipping point, escape velocity, and the ceilings that follow.',
  },
  {
    id: 'atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    cover: 'covers/atomic-habits.jpg',
    synopsis:
      'Clear\'s case is that tiny changes compound: get one percent better each day and the results are dramatic over a year. Built around four laws of behaviour change — make it obvious, attractive, easy, and satisfying — and a central argument that you should build systems rather than set goals.',
  },
  {
    id: 'creative-act',
    title: 'The Creative Act: A Way of Being',
    author: 'Rick Rubin',
    cover: 'covers/creative-act.jpg',
    synopsis:
      'Less a manual than a set of meditations. Across dozens of short chapters, the legendary producer treats creativity as a way of paying attention rather than a skill reserved for artists — covering sources, experimentation, self-doubt, and knowing when a work is finished.',
  },
  {
    id: 'inspired',
    title: 'Inspired: How to Create Tech Products Customers Love',
    author: 'Marty Cagan',
    cover: 'covers/inspired.jpg',
    synopsis:
      'Cagan\'s account of how the strongest product teams actually work: how they are staffed, how product managers, designers, and engineers collaborate, and the discovery techniques they use to find something worth building before committing to build it. A widely used reference for modern product management.',
  },
  {
    id: 'build',
    title: 'Build: An Unorthodox Guide to Making Things Worth Making',
    author: 'Tony Fadell',
    cover: 'covers/build.jpg',
    synopsis:
      'Part memoir, part hard-won advice from the man behind the iPod, the iPhone, and Nest. Fadell writes in short, blunt chapters about building products, managing teams, choosing a job, raising money, and the messy reality of shipping things people care about.',
  },
  {
    id: 'user-friendly',
    title: 'User Friendly',
    author: 'Cliff Kuang',
    cover: 'covers/user-friendly.jpg',
    synopsis:
      'A history of how user-centred design quietly reshaped the modern world, from Three Mile Island control panels to the smartphone. Kuang and Fabricant trace how designers learned to treat human error as a design failure rather than a human one.',
  },
  {
    id: 'designing-your-life',
    title: 'Designing Your Life',
    author: 'Bill Burnett & Dave Evans',
    cover: 'covers/designing-your-life.jpg',
    synopsis:
      'Two Stanford design professors apply design thinking to the question of what to do with your life. Rather than searching for one true calling, they suggest reframing unhelpful beliefs, prototyping several possible lives, and testing them through conversations and small experiments.',
  },
  {
    id: 'indistractable',
    title: 'Indistractable: How to Control Your Attention',
    author: 'Nir Eyal',
    cover: 'covers/indistractable.jpg',
    synopsis:
      'A counterweight to his own Hooked. Eyal argues distraction begins with internal discomfort rather than technology, and offers tactics for handling those triggers, timeboxing your day, defusing external interruptions, and making pacts that keep you honest.',
  },
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
const bookMetaEl = document.getElementById('bookMeta');
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
    // A side cover steps the shelf along; the centre one opens its details.
    el.addEventListener('click', () => {
      if (wrapOffset(slot - slotCursor) === 0) openTray(books[slot % n]);
      else goToSlot(slot);
    });
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
  if (bookTitleEl.textContent !== book.title) {
    bookTitleEl.textContent = book.title;
    bookAuthorEl.textContent = book.author;
    // Restart the cross-fade: drop the class, force a reflow, re-add it.
    bookMetaEl.classList.remove('swap');
    void bookMetaEl.offsetWidth;
    bookMetaEl.classList.add('swap');
  }
}

function setCursor(c) {
  slotCursor = c;
  layout();
}

/* Move by whole positions along the shelf. */
function nudge(delta) {
  cancelShuttle();
  setCursor(slotCursor + delta);
}

/* Travel to a target one position at a time, so the shelf visibly shuttles
   through the books in between rather than teleporting past them. Each step
   interrupts the previous CSS transition, which blends them into one glide. */
let shuttleTimer = null;

function cancelShuttle() {
  if (shuttleTimer) {
    clearInterval(shuttleTimer);
    shuttleTimer = null;
  }
}

function shuttleBy(delta) {
  cancelShuttle();
  if (delta === 0) return;

  const dir = Math.sign(delta);
  let remaining = Math.abs(delta);

  // Longer journeys move faster per book, so crossing the shelf stays brisk.
  const interval = remaining > 4 ? 85 : remaining > 2 ? 110 : 150;

  setCursor(slotCursor + dir);
  remaining--;
  if (remaining === 0) return;

  shuttleTimer = setInterval(() => {
    setCursor(slotCursor + dir);
    if (--remaining <= 0) cancelShuttle();
  }, interval);
}

/* Collapse the shelf to the middle and let it fan back out, so returning to
   cover view replays the same entrance the page opens with. */
function replayShelf() {
  const els = [...coverflowEl.querySelectorAll('.book')];

  els.forEach((el) => {
    el.style.transition = 'none';
    el.style.transform = 'translateX(0) translateZ(-60px) rotateY(0deg) scaleY(0.97)';
    delete el.dataset.off; // so layout() doesn't read this as a wrap and snap
  });
  void coverflowEl.offsetWidth; // flush the collapsed state before animating

  els.forEach((el) => {
    const abs = Math.abs(wrapOffset(Number(el.dataset.slot) - slotCursor));
    el.style.transition = '';
    el.style.transitionDelay = `${Math.min(abs * 45, 400)}ms`;
  });
  layout();

  setTimeout(() => els.forEach((el) => { el.style.transitionDelay = ''; }), 1100);
}

/* Bring a specific rendered slot to the centre, travelling the short way. */
function goToSlot(slot) {
  shuttleBy(wrapOffset(slot - slotCursor));
}

/* Bring a specific book to the centre, travelling the short way. */
function selectBook(bookIndex) {
  const n = books.length;
  let delta = (((bookIndex - currentBookIndex()) % n) + n) % n;
  if (delta > n / 2) delta -= n;
  shuttleBy(delta);
}

/* Keyboard */
document.addEventListener('keydown', (e) => {
  if (!modalBackdrop.hidden || !trayEl.hidden) return;
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
  cancelShuttle(); // a drag takes over from any in-flight travel
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

/* ============================== Book detail tray ============================== */

const trayEl = document.getElementById('tray');
const trayScrim = document.getElementById('trayScrim');
const trayCover = document.getElementById('trayCover');
const trayTitle = document.getElementById('trayTitle');
const trayAuthor = document.getElementById('trayAuthor');
const traySynopsis = document.getElementById('traySynopsis');
const trayCtas = document.getElementById('trayCtas');

/* Search links rather than direct product URLs — a search always resolves,
   where a hardcoded product id would rot or point at the wrong edition. */
const RETAILERS = [
  { label: 'Buy on Amazon', primary: true, url: (q) => `https://www.amazon.com/s?k=${q}&i=stripbooks` },
  { label: 'Apple Books', url: (q) => `https://books.apple.com/us/search?term=${q}` },
  { label: 'Bookshop.org', url: (q) => `https://bookshop.org/search?keywords=${q}` },
  { label: 'Borrow on Open Library', url: (q) => `https://openlibrary.org/search?q=${q}` },
];

function openTray(book) {
  trayCover.src = coverSrc(book);
  trayCover.alt = `${book.title} cover`;
  trayTitle.textContent = book.title;
  trayAuthor.textContent = book.author;
  traySynopsis.textContent = book.synopsis || 'No synopsis saved for this book yet.';

  const query = encodeURIComponent(`${book.title} ${book.author}`.trim());
  trayCtas.innerHTML = '';
  RETAILERS.forEach((r) => {
    const a = document.createElement('a');
    a.className = `glass tray-cta${r.primary ? ' primary' : ''}`;
    a.href = r.url(query);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = r.label;
    trayCtas.appendChild(a);
  });

  trayEl.hidden = false;
  trayScrim.hidden = false;
  // Next frame, so the slide-up transition has a starting position to run from.
  requestAnimationFrame(() => {
    trayEl.classList.add('open');
    trayScrim.classList.add('open');
  });
}

function closeTray() {
  if (trayEl.hidden) return;
  trayEl.classList.remove('open');
  trayScrim.classList.remove('open');
  const done = () => {
    trayEl.hidden = true;
    trayScrim.hidden = true;
  };
  trayEl.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 500); // in case the transition never fires
}

document.getElementById('trayGrip').addEventListener('click', closeTray);
trayScrim.addEventListener('click', closeTray);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTray();
});

/* Swipe the tray down to dismiss it. */
let trayDragY = null;
trayEl.addEventListener('pointerdown', (e) => {
  if (e.target.closest('a')) return;
  trayDragY = e.clientY;
});
trayEl.addEventListener('pointerup', (e) => {
  if (trayDragY !== null && e.clientY - trayDragY > 60) closeTray();
  trayDragY = null;
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

  list.forEach((book, i) => {
    const item = document.createElement('div');
    item.className = 'browse-item';
    // Cascade the tiles in, capped so a long shelf doesn't crawl.
    item.style.animationDelay = `${Math.min(i * 40, 480)}ms`;

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
    // Centre it on the shelf behind us, and show its details
    item.addEventListener('click', () => {
      selectBook(books.indexOf(book));
      openTray(book);
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
  if (isCover) replayShelf();
  else renderBrowse();
}

document.getElementById('viewCtas').addEventListener('click', (e) => {
  const btn = e.target.closest('.view-cta');
  if (btn) setView(btn.dataset.view);
});

/* ---------- Tabs, and the dropdown they collapse into on mobile ---------- */

const tabsNav = document.getElementById('tabsNav');
const tabMenu = document.getElementById('tabMenu');
const tabLinks = [...document.querySelectorAll('.tab-link')];

function tabsCollapsed() {
  return window.innerWidth <= 900;
}

const tabIndicator = document.getElementById('tabIndicator');

/* Slide the underline to sit beneath the active tab. */
function moveTabIndicator({ animate = true } = {}) {
  const active = tabLinks.find((t) => t.classList.contains('active'));
  if (!active || !active.offsetParent) return; // nothing shown to measure

  if (!animate) tabIndicator.style.transition = 'none';

  const navLeft = tabsNav.getBoundingClientRect().left;
  const rect = active.getBoundingClientRect();
  tabIndicator.style.width = `${rect.width}px`;
  tabIndicator.style.transform = `translateX(${rect.left - navLeft}px)`;

  if (!animate) {
    void tabIndicator.offsetWidth; // commit before re-enabling the transition
    tabIndicator.style.transition = '';
  }
}

function setActiveTab(tab) {
  tabLinks.forEach((t) => {
    const on = t.dataset.tab === tab;
    t.classList.toggle('active', on);
    if (on) t.setAttribute('aria-haspopup', 'menu');
    else t.removeAttribute('aria-haspopup');
  });
  moveTabIndicator();
}

/* Fonts land after first paint and change tab widths, so measure again. */
window.addEventListener('load', () => moveTabIndicator({ animate: false }));
if (document.fonts) {
  document.fonts.ready.then(() => moveTabIndicator({ animate: false }));
}
window.addEventListener('resize', () => moveTabIndicator({ animate: false }));

function buildTabMenu() {
  tabMenu.innerHTML = '';
  tabLinks.forEach((link) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.textContent = link.dataset.label;
    item.classList.toggle('current', link.classList.contains('active'));
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      setActiveTab(link.dataset.tab);
      closeTabMenu();
    });
    tabMenu.appendChild(item);
  });
}

function openTabMenu() {
  buildTabMenu();
  tabMenu.hidden = false;
  requestAnimationFrame(() => tabMenu.classList.add('open'));
  tabLinks.forEach((t) => {
    if (t.classList.contains('active')) t.setAttribute('aria-expanded', 'true');
  });
}

function closeTabMenu() {
  if (tabMenu.hidden) return;
  tabMenu.classList.remove('open');
  const done = () => { tabMenu.hidden = true; };
  tabMenu.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 400);
  tabLinks.forEach((t) => t.setAttribute('aria-expanded', 'false'));
}

tabsNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-link');
  if (!btn) return;
  e.stopPropagation();
  // Collapsed, only the current tab is on screen — so tapping it opens the menu.
  if (tabsCollapsed() && btn.classList.contains('active')) {
    if (tabMenu.hidden) openTabMenu();
    else closeTabMenu();
    return;
  }
  setActiveTab(btn.dataset.tab);
});

document.addEventListener('click', (e) => {
  if (!tabMenu.hidden && !tabMenu.contains(e.target)) closeTabMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTabMenu();
});
window.addEventListener('resize', () => {
  if (!tabsCollapsed()) closeTabMenu();
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

/* ---------- Identifying a book from a photograph ---------- */

const candidatesEl = document.getElementById('candidates');
const candidateListEl = document.getElementById('candidateList');
const usePhotoBtn = document.getElementById('usePhotoBtn');

/* Tesseract is ~6MB of wasm and language data, so it is fetched from
   assets/vendor only the first time a cover actually needs reading. */
let ocrWorker = null;
async function getOcrWorker() {
  if (ocrWorker) return ocrWorker;
  if (typeof Tesseract === 'undefined') throw new Error('OCR library unavailable');
  ocrWorker = await Tesseract.createWorker('eng', 1, {
    workerPath: 'assets/vendor/worker.min.js',
    corePath: 'assets/vendor/tesseract-core-simd.wasm.js',
    langPath: 'assets/vendor',
  });
  return ocrWorker;
}

/* Tesseract v5 reports lines under blocks; older shapes expose data.lines. */
function ocrLines(data) {
  if (Array.isArray(data.lines) && data.lines.length) return data.lines;
  const out = [];
  (data.blocks || []).forEach((b) =>
    (b.paragraphs || []).forEach((p) => (p.lines || []).forEach((l) => out.push(l)))
  );
  return out;
}

/* Cover furniture that is never part of the title. */
const COVER_BLURB =
  /(new york times|bestseller|best seller|copies sold|author of|million|instant|national|award|winner|edition|foreword|introduction|www\.|\.com|publish)/i;

/* Rank lines by how big the type is, not how long the line is: on a book
   cover the title is set largest, while the longest lines are usually
   review blurbs and sales copy. */
function queryFromOcr(data) {
  const lines = ocrLines(data)
    .map((l) => ({
      text: (l.text || '').replace(/[^A-Za-z0-9'’&:\- ]/g, ' ').replace(/\s+/g, ' ').trim(),
      size: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0,
    }))
    .filter((l) => l.text.length >= 3 && /[A-Za-z]{3}/.test(l.text))
    .filter((l) => !COVER_BLURB.test(l.text));

  lines.sort((a, b) => b.size - a.size);

  const seen = new Set();
  const picked = [];
  for (const l of lines) {
    const key = l.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(l.text);
    if (picked.length === 4) break;
  }
  return picked.join(' ').slice(0, 120);
}

async function searchOpenLibrary(query) {
  const url =
    'https://openlibrary.org/search.json?q=' +
    encodeURIComponent(query) +
    '&fields=title,author_name,cover_i,first_publish_year&limit=6';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return (data.docs || []).filter((d) => d.cover_i);
}

function showCandidates(matches, photoSrc) {
  pendingCoverSrc = photoSrc; // kept for the "use my photo" fallback
  candidateListEl.innerHTML = '';

  matches.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'candidate';
    btn.type = 'button';

    const img = document.createElement('img');
    img.src = `https://covers.openlibrary.org/b/id/${m.cover_i}-M.jpg`;
    img.alt = '';

    const text = document.createElement('div');
    text.className = 'candidate-text';
    const t = document.createElement('strong');
    t.textContent = m.title;
    const a = document.createElement('span');
    a.textContent = [m.author_name?.[0], m.first_publish_year].filter(Boolean).join(' · ');
    text.append(t, a);

    btn.append(img, text);
    btn.addEventListener('click', () => {
      candidatesEl.hidden = true;
      showConfirm({
        title: m.title,
        author: m.author_name?.[0] || '',
        // Prefer the publisher's artwork over the photograph
        coverSrc: `https://covers.openlibrary.org/b/id/${m.cover_i}-L.jpg`,
      });
    });
    candidateListEl.appendChild(btn);
  });

  candidatesEl.hidden = false;
}

usePhotoBtn.addEventListener('click', () => {
  candidatesEl.hidden = true;
  showConfirm({ title: '', author: '', coverSrc: pendingCoverSrc, needsTitle: true });
});

/* Barcode first (exact), then read the cover text and search for a match. */
async function identify(source, photoSrc) {
  hideConfirm();
  candidatesEl.hidden = true;
  pendingCoverSrc = photoSrc;

  const detector = await getBarcodeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(source);
      const isbn = codes.map((c) => c.rawValue).find((v) => /^97[89]\d{10}$/.test(v));
      if (isbn) {
        await lookupAndConfirm(isbn);
        return;
      }
    } catch { /* no barcode in frame — fall through to reading the cover */ }
  }

  setStatus('Reading the cover…');
  let query = '';
  try {
    const worker = await getOcrWorker();
    // blocks:true gives per-line bounding boxes, which is how type size is read
    const { data } = await worker.recognize(source, {}, { text: true, blocks: true });
    query = queryFromOcr(data);
  } catch (err) {
    console.warn('OCR failed:', err);
  }

  if (!query) {
    setStatus("Couldn't read any text on that cover. Add the details yourself.", true);
    showConfirm({ title: '', author: '', coverSrc: photoSrc, needsTitle: true });
    return;
  }

  setStatus(`Looking up “${query.slice(0, 48)}”…`);
  try {
    const matches = await searchOpenLibrary(query);
    if (!matches.length) {
      setStatus('No match found for that cover. Add the details yourself.', true);
      showConfirm({ title: '', author: '', coverSrc: photoSrc, needsTitle: true });
      return;
    }
    setStatus('');
    showCandidates(matches, photoSrc);
  } catch (err) {
    console.warn(err);
    setStatus('Search is unavailable right now. Add the details yourself.', true);
    showConfirm({ title: '', author: '', coverSrc: photoSrc, needsTitle: true });
  }
}

captureBtn.addEventListener('click', async () => {
  const canvas = grabFrame({ cropPortrait: true });
  if (!canvas) {
    setStatus('Camera is not ready yet — give it a second.', true);
    return;
  }
  captureBtn.disabled = true;
  try {
    await identify(canvas, canvas.toDataURL('image/jpeg', 0.85));
  } finally {
    captureBtn.disabled = false;
  }
});

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  setStatus('Reading photo…');

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / bitmap.width);
  captureCanvas.width = Math.round(bitmap.width * scale);
  captureCanvas.height = Math.round(bitmap.height * scale);
  captureCanvas.getContext('2d').drawImage(bitmap, 0, 0, captureCanvas.width, captureCanvas.height);

  await identify(captureCanvas, captureCanvas.toDataURL('image/jpeg', 0.85));
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
