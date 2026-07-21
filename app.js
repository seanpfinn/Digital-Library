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
const REMOVED_KEY = 'digital-library-removed';
const READ_KEY = 'digital-library-read';
const LISTS_KEY = 'digital-library-lists';

function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Could not persist ${key}`, e);
  }
}

/* Read state (id -> true) and reading lists ([{id, name, bookIds}]). */
let readStatus = loadJSON(READ_KEY, {});
let lists = loadJSON(LISTS_KEY, []);

function isRead(book) {
  return !!readStatus[book.id];
}
function setRead(book, read) {
  if (read) readStatus[book.id] = true;
  else delete readStatus[book.id];
  saveJSON(READ_KEY, readStatus);
}

function saveLists() {
  saveJSON(LISTS_KEY, lists);
}
function createList(name) {
  const list = { id: `list-${Date.now()}`, name: name.trim() || 'Untitled list', bookIds: [] };
  lists.push(list);
  saveLists();
  return list;
}
function deleteList(id) {
  lists = lists.filter((l) => l.id !== id);
  saveLists();
}
function toggleBookInList(list, book) {
  const i = list.bookIds.indexOf(book.id);
  if (i >= 0) list.bookIds.splice(i, 1);
  else list.bookIds.push(book.id);
  saveLists();
}
function listsContaining(book) {
  return lists.filter((l) => l.bookIds.includes(book.id)).length;
}

function loadCustomBooks() {
  return loadJSON(STORAGE_KEY, []);
}

/* Ids of built-in books the reader has taken off the shelf. Removing a
   custom book just drops it; removing a default one has to be remembered. */
let removedIds = loadJSON(REMOVED_KEY, []);

function saveCustomBooks() {
  const custom = books.filter((b) => b.custom);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    localStorage.setItem(REMOVED_KEY, JSON.stringify(removedIds));
  } catch (e) {
    console.warn('Could not persist books (storage full?)', e);
  }
}

function removeBook(id) {
  const i = books.findIndex((b) => b.id === id);
  if (i < 0) return;
  const wasDefault = DEFAULT_BOOKS.some((b) => b.id === id);

  books.splice(i, 1);
  if (wasDefault && !removedIds.includes(id)) removedIds.push(id);
  saveCustomBooks();

  // Forget its read state and drop it from any lists.
  delete readStatus[id];
  saveJSON(READ_KEY, readStatus);
  let listsChanged = false;
  lists.forEach((l) => {
    const j = l.bookIds.indexOf(id);
    if (j >= 0) { l.bookIds.splice(j, 1); listsChanged = true; }
  });
  if (listsChanged) saveLists();

  // Keep the shelf pointing at roughly where the reader was looking.
  if (books.length) slotCursor = Math.max(0, Math.min(slotCursor, books.length - 1));
  buildCoverflow();
  if (currentView !== 'cover') renderBrowse();
  updateEmptyState();
}

let books = [
  ...DEFAULT_BOOKS.filter((b) => !removedIds.includes(b.id)),
  ...loadCustomBooks(),
];

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
  if (!n) {
    coverflowEl.innerHTML = '';
    slotCount = 0;
    return;
  }
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
  if (!books.length || !slotCount) return;
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

const trayRemove = document.getElementById('trayRemove');
const emptyShelf = document.getElementById('emptyShelf');
let trayBook = null;

/* Hide the shelf and prompt when there is nothing left to show. */
function updateEmptyState() {
  // The Collection views only exist on the Collection tab.
  if (typeof currentTab !== 'undefined' && currentTab !== 'collection') {
    emptyShelf.hidden = true;
    stageEl.hidden = true;
    browseEl.hidden = true;
    return;
  }
  const empty = books.length === 0;
  emptyShelf.hidden = !empty;
  stageEl.hidden = empty || currentView !== 'cover';
  browseEl.hidden = empty || currentView === 'cover';
}

function resetRemoveButton() {
  trayRemove.classList.remove('confirming');
  trayRemove.textContent = 'Remove from library';
}

trayRemove.addEventListener('click', () => {
  if (!trayBook) return;
  // First click arms it, second confirms.
  if (!trayRemove.classList.contains('confirming')) {
    trayRemove.classList.add('confirming');
    trayRemove.textContent = 'Tap again to remove';
    setTimeout(resetRemoveButton, 4000);
    return;
  }
  removeBook(trayBook.id);
  closeTray();
});

/* ----- Read status & lists, in the tray ----- */
const trayStatusEl = document.getElementById('trayStatus');
const trayListBtn = document.getElementById('trayListBtn');
const trayListLabel = document.getElementById('trayListLabel');
const trayListMenu = document.getElementById('trayListMenu');

function renderTrayStatus(book) {
  const read = isRead(book);
  trayStatusEl.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', (b.dataset.read === 'true') === read);
  });
}

trayStatusEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || !trayBook) return;
  setRead(trayBook, btn.dataset.read === 'true');
  renderTrayStatus(trayBook);
  // Reflect the change wherever the book is shown.
  if (currentTab === 'collection' && currentView !== 'cover') renderBrowse();
  if (currentTab === 'list') renderLists();
});

function updateTrayListLabel(book) {
  const n = listsContaining(book);
  trayListLabel.textContent = n ? `In ${n} list${n === 1 ? '' : 's'}` : 'Add to list';
}

function renderTrayListMenu(book) {
  trayListMenu.innerHTML = '';

  lists.forEach((list) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'listmenu-item';
    const inList = list.bookIds.includes(book.id);
    row.classList.toggle('checked', inList);
    row.innerHTML = `<span class="listmenu-check" aria-hidden="true"></span><span class="listmenu-name"></span>`;
    row.querySelector('.listmenu-name').textContent = list.name;
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookInList(list, book);
      row.classList.toggle('checked', list.bookIds.includes(book.id));
      updateTrayListLabel(book);
      if (currentTab === 'list') renderLists();
    });
    trayListMenu.appendChild(row);
  });

  // New-list creator
  const create = document.createElement('div');
  create.className = 'listmenu-create';
  create.innerHTML =
    '<input type="text" placeholder="New list name" maxlength="60" />' +
    '<button type="button">Create</button>';
  const input = create.querySelector('input');
  const addBtn = create.querySelector('button');
  const submit = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    const list = createList(name);
    toggleBookInList(list, book);
    renderTrayListMenu(book);
    updateTrayListLabel(book);
    if (currentTab === 'list') renderLists();
  };
  addBtn.addEventListener('click', (e) => { e.stopPropagation(); submit(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.stopPropagation(); submit(); } });
  input.addEventListener('click', (e) => e.stopPropagation());
  trayListMenu.appendChild(create);
}

function openTrayListMenu() {
  if (!trayBook) return;
  renderTrayListMenu(trayBook);
  trayListMenu.hidden = false;
  trayListBtn.setAttribute('aria-expanded', 'true');
}
function closeTrayListMenu() {
  trayListMenu.hidden = true;
  trayListBtn.setAttribute('aria-expanded', 'false');
}
trayListBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (trayListMenu.hidden) openTrayListMenu();
  else closeTrayListMenu();
});
document.addEventListener('click', (e) => {
  if (!trayListMenu.hidden && !trayListMenu.contains(e.target) && e.target !== trayListBtn) {
    closeTrayListMenu();
  }
});

function openTray(book) {
  trayBook = book;
  resetRemoveButton();
  closeTrayListMenu();
  renderTrayStatus(book);
  updateTrayListLabel(book);
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
    if (isRead(book)) item.appendChild(readBadge());
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

const viewCtasEl = document.getElementById('viewCtas');
const explorePage = document.getElementById('explorePage');
const listPage = document.getElementById('listPage');
const settingsPage = document.getElementById('settingsPage');
let currentTab = 'collection';

function setActiveTab(tab) {
  currentTab = tab;
  tabLinks.forEach((t) => {
    const on = t.dataset.tab === tab;
    t.classList.toggle('active', on);
    if (on) t.setAttribute('aria-haspopup', 'menu');
    else t.removeAttribute('aria-haspopup');
  });
  moveTabIndicator();
  applyTab();
}

/* Show the content that belongs to the active tab, hide the rest. */
function applyTab() {
  const isCollection = currentTab === 'collection';
  viewCtasEl.hidden = !isCollection;
  explorePage.hidden = currentTab !== 'explore';
  listPage.hidden = currentTab !== 'list';
  settingsPage.hidden = currentTab !== 'settings';
  closeTray();

  if (isCollection) {
    updateEmptyState();
    if (books.length) {
      if (currentView === 'cover') replayShelf();
      else renderBrowse();
    }
  } else {
    stageEl.hidden = true;
    browseEl.hidden = true;
    emptyShelf.hidden = true;
    if (currentTab === 'explore') renderExplore();
    if (currentTab === 'list') renderLists();
    if (currentTab === 'settings') renderSettings();
  }
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

/* Searching from another tab drops you back into the Collection to see results. */
searchInput.addEventListener('input', () => {
  if (currentTab !== 'collection') {
    if (!searchInput.value.trim()) return;
    setActiveTab('collection');
  }
  if (currentView === 'cover') {
    const match = visibleBooks()[0];
    if (match && searchInput.value.trim()) selectBook(books.indexOf(match));
  } else {
    renderBrowse();
  }
});

/* ============================== Explore & Settings pages ============================== */

function elem(tag, cls) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function bookById(id) {
  return books.find((b) => b.id === id);
}

/* ---------- Explore ---------- */

const EXPLORE_SHELVES = [
  { title: 'Building Products', ids: ['inspired', 'hooked', 'cold-start-problem', 'build'] },
  { title: 'Focus & Habits', ids: ['atomic-habits', 'indistractable', 'designing-your-life'] },
  { title: 'Design & Creativity', ids: ['creative-act', 'user-friendly'] },
];
const FEATURED_ORDER = ['inspired', 'atomic-habits', 'creative-act', 'build', 'hooked'];

function readBadge() {
  const b = elem('span', 'read-badge');
  b.title = 'Read';
  b.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return b;
}

function shelfItem(book) {
  const item = elem('div', 'shelf-item');
  const img = elem('img');
  img.src = coverSrc(book);
  img.alt = book.title;
  img.loading = 'lazy';
  const t = elem('h4');
  t.textContent = book.title;
  const s = elem('span');
  s.textContent = book.author;
  item.append(img, t, s);
  if (isRead(book)) item.appendChild(readBadge());
  item.addEventListener('click', () => openTray(book));
  return item;
}

function shelfRow(title, items) {
  const row = elem('div', 'shelf-row');
  const head = elem('div', 'shelf-head');
  const h = elem('h3', 'shelf-title');
  h.textContent = title;
  const count = elem('span', 'shelf-count');
  count.textContent = `${items.length} book${items.length === 1 ? '' : 's'}`;
  head.append(h, count);

  const scroll = elem('div', 'shelf-scroll');
  items.forEach((b) => scroll.appendChild(shelfItem(b)));
  row.append(head, scroll);
  return row;
}

function renderExplore() {
  const inner = document.getElementById('exploreInner');
  inner.innerHTML = '';

  if (!books.length) {
    const empty = elem('div', 'empty-state');
    empty.style.marginTop = '6vh';
    empty.innerHTML = "<h2>Nothing to explore yet</h2><p>Add a few books and we'll surface them here.</p>";
    inner.appendChild(empty);
    return;
  }

  // Featured pick
  const featured = FEATURED_ORDER.map(bookById).find(Boolean) || books[0];
  const hero = elem('div', 'explore-hero');
  const heroCover = elem('img', 'explore-hero-cover');
  heroCover.src = coverSrc(featured);
  heroCover.alt = featured.title;
  heroCover.addEventListener('click', () => openTray(featured));

  const body = elem('div', 'explore-hero-body');
  const eyebrow = elem('p', 'explore-eyebrow');
  eyebrow.textContent = "Editor's Pick";
  const ht = elem('h3', 'explore-hero-title');
  ht.textContent = featured.title;
  const ha = elem('p', 'explore-hero-author');
  ha.textContent = featured.author;
  const hs = elem('p', 'explore-hero-synopsis');
  hs.textContent = featured.synopsis || '';
  const hb = elem('button', 'explore-hero-btn');
  hb.textContent = 'View details';
  hb.addEventListener('click', () => openTray(featured));
  body.append(eyebrow, ht, ha, hs, hb);
  hero.append(heroCover, body);
  inner.appendChild(hero);

  // Curated shelves, filtered to what's actually on the shelf
  const shown = new Set();
  const shelves = EXPLORE_SHELVES
    .map((s) => ({ title: s.title, items: s.ids.map(bookById).filter(Boolean) }))
    .filter((s) => s.items.length);
  shelves.forEach((s) => s.items.forEach((b) => shown.add(b.id)));

  // Anything not in a curated group (e.g. books you added yourself)
  const leftover = books.filter((b) => !shown.has(b.id));
  if (leftover.length) shelves.push({ title: 'More in your library', items: leftover });

  shelves.forEach((s) => inner.appendChild(shelfRow(s.title, s.items)));
}

/* ---------- Lists ---------- */

function listSection(list) {
  const section = elem('div', 'list-section');

  const head = elem('div', 'list-section-head');
  const left = elem('div', 'list-section-headleft');
  const title = elem('h2', 'list-section-title');
  title.textContent = list.name;
  const count = elem('span', 'list-section-count');
  count.textContent = `${list.bookIds.length} book${list.bookIds.length === 1 ? '' : 's'}`;
  left.append(title, count);

  const del = elem('button', 'list-del-btn');
  del.type = 'button';
  del.textContent = 'Delete';
  del.addEventListener('click', () => {
    if (!del.classList.contains('confirming')) {
      del.classList.add('confirming');
      del.textContent = 'Confirm delete';
      setTimeout(() => { del.classList.remove('confirming'); del.textContent = 'Delete'; }, 4000);
      return;
    }
    deleteList(list.id);
    renderLists();
  });
  head.append(left, del);
  section.appendChild(head);

  const items = list.bookIds.map(bookById).filter(Boolean);
  if (!items.length) {
    const hint = elem('p', 'list-empty-hint');
    hint.textContent = 'No books yet — open any book and choose “Add to list”.';
    section.appendChild(hint);
  } else {
    const scroll = elem('div', 'shelf-scroll');
    items.forEach((b) => scroll.appendChild(shelfItem(b)));
    section.appendChild(scroll);
  }
  return section;
}

function startNewList() {
  const inner = document.getElementById('listInner');
  if (inner.querySelector('.list-creator')) {
    inner.querySelector('.list-creator input').focus();
    return;
  }
  const creator = elem('div', 'list-creator');
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'List name';
  input.maxLength = 60;
  const create = elem('button', 'lists-new-btn');
  create.type = 'button';
  create.textContent = 'Create';
  const cancel = elem('button', 'list-del-btn');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';

  const submit = () => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    createList(name);
    renderLists();
  };
  create.addEventListener('click', submit);
  cancel.addEventListener('click', () => renderLists());
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
    if (e.key === 'Escape') renderLists();
  });

  creator.append(input, create, cancel);
  // Just below the header row
  inner.insertBefore(creator, inner.children[1] || null);
  input.focus();
}

function renderLists() {
  const inner = document.getElementById('listInner');
  inner.innerHTML = '';

  const head = elem('div', 'lists-head');
  const h = elem('h1', 'lists-title');
  h.textContent = 'Lists';
  const newBtn = elem('button', 'lists-new-btn');
  newBtn.type = 'button';
  newBtn.textContent = '+ New list';
  newBtn.addEventListener('click', startNewList);
  head.append(h, newBtn);
  inner.appendChild(head);

  if (!lists.length) {
    const empty = elem('div', 'empty-state');
    const art = elem('div', 'empty-art');
    art.innerHTML =
      '<svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="40" cy="40" r="40" fill="#EAF0FF"/>' +
      '<path d="M30 25h20a3 3 0 0 1 3 3v27l-13-8-13 8V28a3 3 0 0 1 3-3z" fill="#fff" stroke="#004BEC" stroke-width="2.6" stroke-linejoin="round"/>' +
      '</svg>';
    const h2 = document.createElement('h2');
    h2.textContent = 'No lists yet';
    const p = document.createElement('p');
    p.textContent = 'Group books into lists — “To read”, “Favourites”, anything. Create one, then add books from their details.';
    const cta = elem('button', 'explore-hero-btn');
    cta.type = 'button';
    cta.textContent = 'Create a list';
    cta.addEventListener('click', startNewList);
    empty.append(art, h2, p, cta);
    inner.appendChild(empty);
    return;
  }

  lists.forEach((list) => inner.appendChild(listSection(list)));
}

/* ---------- Settings ---------- */

const SETTINGS_KEY = 'digital-library-settings';
let settings = { defaultView: 'cover', reflections: true, reduceMotion: false, ...loadJSON(SETTINGS_KEY, {}) };

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not persist settings', e);
  }
}

function applySettings() {
  document.documentElement.classList.toggle('no-reflections', !settings.reflections);
  document.documentElement.classList.toggle('reduce-motion', !!settings.reduceMotion);
}

/* Rebuild the library array + UI after a library-level change. */
function rebuildLibrary() {
  const custom = books.filter((b) => b.custom);
  books = [...DEFAULT_BOOKS.filter((b) => !removedIds.includes(b.id)), ...custom];
  saveCustomBooks();
  slotCursor = 0;
  buildCoverflow();
  updateEmptyState();
  if (currentTab === 'settings') renderSettings();
}

function restoreRemoved() {
  removedIds = [];
  rebuildLibrary();
}

function resetLibrary() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REMOVED_KEY);
  } catch { /* ignore */ }
  removedIds = [];
  books = [...DEFAULT_BOOKS];
  slotCursor = 0;
  buildCoverflow();
  updateEmptyState();
  renderSettings();
}

/* Small builders for the settings rows */
function settingsToggle(checked, onChange) {
  const label = elem('label', 'switch');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = !!checked;
  const track = elem('span', 'track');
  input.addEventListener('change', () => onChange(input.checked));
  label.append(input, track);
  return label;
}

function settingsSegmented(options, active, onChange) {
  const wrap = elem('div', 'segmented');
  options.forEach((opt) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = opt[0].toUpperCase() + opt.slice(1);
    b.classList.toggle('active', opt === active);
    b.addEventListener('click', () => {
      [...wrap.children].forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      onChange(opt);
    });
    wrap.appendChild(b);
  });
  return wrap;
}

function settingsRow(strongText, spanText, control) {
  const row = elem('div', 'settings-row');
  const text = elem('div', 'settings-row-text');
  const s = document.createElement('strong');
  s.textContent = strongText;
  const p = document.createElement('span');
  p.textContent = spanText;
  text.append(s, p);
  row.appendChild(text);
  if (control) {
    const c = elem('div', 'settings-row-control');
    c.appendChild(control);
    row.appendChild(c);
  }
  return row;
}

function settingsGroup(title, rows) {
  const g = elem('div', 'settings-group');
  const h = document.createElement('h2');
  h.textContent = title;
  const card = elem('div', 'settings-card');
  rows.forEach((r) => card.appendChild(r));
  g.append(h, card);
  return g;
}

function settingsActionBtn(label, onClick, danger = false) {
  const b = elem('button', `settings-btn${danger ? ' danger' : ''}`);
  b.textContent = label;
  if (danger) {
    // Destructive — tap twice to confirm.
    b.addEventListener('click', () => {
      if (!b.classList.contains('confirming')) {
        b.classList.add('confirming');
        b.textContent = 'Tap to confirm';
        setTimeout(() => {
          b.classList.remove('confirming');
          b.textContent = label;
        }, 4000);
        return;
      }
      onClick();
    });
  } else {
    b.addEventListener('click', onClick);
  }
  return b;
}

function renderSettings() {
  const inner = document.getElementById('settingsInner');
  inner.innerHTML = '';

  // Reading experience
  inner.appendChild(
    settingsGroup('Reading experience', [
      settingsRow(
        'Default view',
        'Which layout the Collection opens in.',
        settingsSegmented(['cover', 'list', 'grid'], settings.defaultView, (v) => {
          settings.defaultView = v;
          saveSettings();
        })
      ),
      settingsRow(
        'Cover reflections',
        'Show the mirrored shine beneath each cover.',
        settingsToggle(settings.reflections, (on) => {
          settings.reflections = on;
          saveSettings();
          applySettings();
        })
      ),
      settingsRow(
        'Reduce motion',
        'Minimise animations and transitions.',
        settingsToggle(settings.reduceMotion, (on) => {
          settings.reduceMotion = on;
          saveSettings();
          applySettings();
        })
      ),
    ])
  );

  // Library
  const libRows = [
    settingsRow('Books in your library', `${books.length} book${books.length === 1 ? '' : 's'} on your shelf.`),
  ];
  if (removedIds.length) {
    libRows.push(
      settingsRow(
        'Hidden originals',
        `${removedIds.length} built-in book${removedIds.length === 1 ? '' : 's'} removed.`,
        settingsActionBtn('Restore', restoreRemoved)
      )
    );
  }
  libRows.push(
    settingsRow(
      'Reset library',
      'Remove books you added and bring back the originals.',
      settingsActionBtn('Reset', resetLibrary, true)
    )
  );
  inner.appendChild(settingsGroup('Library', libRows));

  // About
  const about = elem('div', 'settings-group');
  const ah = document.createElement('h2');
  ah.textContent = 'About';
  const ab = elem('div', 'settings-about');
  ab.innerHTML =
    'Digital Library — a Cover Flow shelf for the books worth keeping.<br>' +
    'Cover art and metadata from <a href="https://openlibrary.org" target="_blank" rel="noopener">Open Library</a>.<br>' +
    'Version 1.0';
  about.append(ah, ab);
  inner.appendChild(about);
}

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

/* The modal shows one view at a time: the live camera (capture), a spinner
   (loading), the matched book (match), an error, or manual entry. */
const modalTabsEl = document.querySelector('.modal-tabs');
const matchLoading = document.getElementById('matchLoading');
const matchLoadingMsg = document.getElementById('matchLoadingMsg');
const matchConfirm = document.getElementById('matchConfirm');
const matchError = document.getElementById('matchError');
let modalView = 'capture';

function setModalView(view) {
  modalView = view;
  const capturing = view === 'capture';
  modalTabsEl.hidden = !capturing;
  cameraWrap.hidden = !(capturing && mediaStream);
  cameraFallback.hidden = !(capturing && !mediaStream);
  scanActions.hidden = !(capturing && mode === 'scan');
  photoActions.hidden = !(capturing && mode === 'photo');
  matchLoading.hidden = view !== 'loading';
  matchConfirm.hidden = view !== 'match';
  matchError.hidden = view !== 'error';
  confirmCard.hidden = view !== 'manual';
  if (view !== 'capture') setStatus('');
}

function setMode(next) {
  mode = next;
  tabScan.classList.toggle('active', mode === 'scan');
  tabScan.setAttribute('aria-selected', String(mode === 'scan'));
  tabPhoto.classList.toggle('active', mode === 'photo');
  tabPhoto.setAttribute('aria-selected', String(mode === 'photo'));
  cameraWrap.classList.toggle('photo-mode', mode === 'photo');
  cameraNote.textContent =
    mode === 'scan'
      ? 'Point the camera at the barcode on the back of the book.'
      : 'Line up the front cover inside the frame.';
  setModalView('capture');
  if (mode === 'scan') startBarcodeLoop();
  else stopBarcodeLoop();
}

tabScan.addEventListener('click', () => setMode('scan'));
tabPhoto.addEventListener('click', () => setMode('photo'));

async function openModal() {
  modalBackdrop.hidden = false;
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
    if (!mediaStream || modalBackdrop.hidden || modalView !== 'capture') return;
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
        await lookupByIsbn(isbn);
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

async function lookupByIsbn(isbn) {
  showLoading(`Looking up ISBN ${isbn}…`);
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

    const match = {
      title: data.title || 'Untitled',
      author,
      year: (data.publish_date || '').match(/\d{4}/)?.[0] || '',
      coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      thumbUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`,
    };
    allMatches = [match];
    showMatch(match);
  } catch (err) {
    console.warn(err);
    showError(
      "We couldn't find that ISBN",
      `No book matched ISBN ${isbn}. Double-check the number, use the cover photo instead, or enter the details yourself.`
    );
  }
}

isbnLookupBtn.addEventListener('click', () => {
  const isbn = isbnInput.value.replace(/[-\s]/g, '');
  if (!/^(97[89]\d{10}|\d{9}[\dXx])$/.test(isbn)) {
    setStatus('That does not look like a valid ISBN (10 or 13 digits).', true);
    return;
  }
  stopBarcodeLoop();
  lookupByIsbn(isbn);
});
isbnInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') isbnLookupBtn.click();
});

/* ---------- Identifying a book from a photograph ---------- */

const candidateListEl = document.getElementById('candidateList');
const usePhotoBtn = document.getElementById('usePhotoBtn');
const matchCover = document.getElementById('matchCover');
const matchTitle = document.getElementById('matchTitle');
const matchAuthor = document.getElementById('matchAuthor');
const matchYear = document.getElementById('matchYear');
const matchAddBtn = document.getElementById('matchAddBtn');
const matchRejectBtn = document.getElementById('matchRejectBtn');
const matchOthers = document.getElementById('matchOthers');
const errorTitle = document.getElementById('errorTitle');
const errorMsg = document.getElementById('errorMsg');
const errorRetryBtn = document.getElementById('errorRetryBtn');
const errorManualBtn = document.getElementById('errorManualBtn');

let allMatches = [];
let currentMatch = null;

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

/* Sales copy and imprints that are never part of the title. */
const COVER_BLURB =
  /(new york times|bestseller|best seller|copies sold|author of|million|instant|national|award|winner|edition|foreword|introduction|www\.|\.com|publish|wiley|penguin|harper|random house|vintage|simon & schuster|macmillan|hachette|portfolio|crown|scribner|bloomsbury)/i;

/* Rank by how big the type is, not how long the line is: a cover sets its
   title largest, while the longest lines are review blurbs and sales copy.
   Display faces often defeat OCR outright (Atomic Habits' halftone title
   reads as "oe oe a 2 eee"), and low confidence is the reliable tell — so
   drop those first, then rank what is left by size. Even when the title
   itself is unreadable, the author line or subtitle usually identifies it. */
function queryFromOcr(data) {
  const all = ocrLines(data)
    .map((l) => {
      const raw = l.text || '';
      return {
        raw,
        // Cover quotes are pull-quotes from reviews, never the title.
        quoted: /^\s*["“”'‘’]/.test(raw) || /must[- ]read|praise for|essential reading/i.test(raw),
        text: raw.replace(/[^A-Za-z0-9'’&\- ]/g, ' ').replace(/\s+/g, ' ').trim(),
        size: l.bbox ? l.bbox.y1 - l.bbox.y0 : 0,
        conf: l.confidence || 0,
      };
    })
    .filter((l) => l.text.length >= 3 && /[A-Za-z]{3}/.test(l.text))
    .filter((l) => !l.quoted && !COVER_BLURB.test(l.text));

  const bySize = (min) =>
    all.filter((l) => l.conf >= min).sort((a, b) => b.size - a.size);

  // Relax the bar rather than give up if a cover reads poorly overall.
  let lines = bySize(70);
  if (!lines.length) lines = bySize(45);
  if (!lines.length) lines = [...all].sort((a, b) => b.size - a.size);

  const seen = new Set();
  const picked = [];
  for (const l of lines) {
    const key = l.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(l.text.slice(0, 60));
    if (picked.length === 5) break;
  }
  return picked;
}

/* Open Library's search wants every term to match, so a single junk word from
   OCR sinks the whole query. Loosen it in stages: the full reading first, then
   fewer lines, and finally each line on its own — merging those results and
   ranking by how many lines agree, since one clean line is often enough. */
async function findMatches(phrases) {
  const tryQuery = async (q) => {
    try {
      return await searchOpenLibrary(q);
    } catch {
      return [];
    }
  };

  const combos = [...new Set(
    [phrases, phrases.slice(0, 3), phrases.slice(0, 2)]
      .map((a) => a.join(' ').trim())
      .filter(Boolean)
  )];

  for (const q of combos) {
    const m = await tryQuery(q);
    if (m.length) return { matches: m.slice(0, 6), query: q };
  }

  const haystack = phrases.join(' ').toLowerCase();

  /* The strongest signal that a result is right: its title is among the words
     we actually read off the cover. Without this, junk phrases return junk
     books that tie with the real one on hit count alone. */
  const titleBonus = (doc) => {
    const t = (doc.title || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return 0;
    if (haystack.includes(t)) return 6;
    const words = t.split(' ').filter((w) => w.length > 3);
    if (!words.length) return 0;
    const overlap = words.filter((w) => haystack.includes(w)).length / words.length;
    return overlap >= 0.6 ? 3 : 0;
  };

  const merged = new Map();
  for (const phrase of phrases.slice(0, 4)) {
    const found = await tryQuery(phrase);
    found.slice(0, 3).forEach((doc, i) => {
      const key = `${doc.title}|${doc.author_name?.[0] || ''}`.toLowerCase();
      const entry = merged.get(key);
      // Ranking higher in a result set counts for more than merely appearing.
      const points = 3 - i;
      if (entry) entry.score += points;
      else merged.set(key, { doc, score: points + titleBonus(doc) });
    });
  }

  const ranked = [...merged.values()].sort((a, b) => b.score - a.score).map((e) => e.doc);
  return { matches: ranked.slice(0, 6), query: phrases.join(' ') };
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

/* Normalise a search doc or ISBN record into one match shape. */
function normalizeMatch(d) {
  if (d.coverUrl) return d; // already normalized (ISBN path)
  return {
    title: d.title || 'Untitled',
    author: d.author_name?.[0] || '',
    year: d.first_publish_year || '',
    coverUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`,
    thumbUrl: `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`,
  };
}

/* The photo is only a reference: once matched, the book is stored with the
   publisher's hi-res artwork from Open Library, never the snapshot. */
function showMatch(match) {
  stopBarcodeLoop();
  currentMatch = match;

  matchCover.onerror = () => { matchCover.onerror = null; matchCover.src = match.thumbUrl || ''; };
  matchCover.src = match.coverUrl;
  matchTitle.textContent = match.title;
  matchAuthor.textContent = match.author || 'Unknown author';
  matchYear.textContent = match.year ? `First published ${match.year}` : '';
  matchYear.hidden = !match.year;

  matchOthers.hidden = true;
  renderOtherMatches();
  setModalView('match');
}

/* Every match except the one on screen, offered under "Not the right book". */
function renderOtherMatches() {
  const others = allMatches.filter((m) => m !== currentMatch);
  candidateListEl.innerHTML = '';
  others.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'candidate';
    btn.type = 'button';

    const img = document.createElement('img');
    img.src = m.thumbUrl || m.coverUrl;
    img.alt = '';

    const text = document.createElement('div');
    text.className = 'candidate-text';
    const t = document.createElement('strong');
    t.textContent = m.title;
    const a = document.createElement('span');
    a.textContent = [m.author, m.year].filter(Boolean).join(' · ');
    text.append(t, a);

    btn.append(img, text);
    btn.addEventListener('click', () => showMatch(m));
    candidateListEl.appendChild(btn);
  });
}

matchAddBtn.addEventListener('click', () => {
  if (currentMatch) addBookToLibrary(currentMatch);
});

matchRejectBtn.addEventListener('click', () => {
  if (allMatches.length > 1) matchOthers.hidden = false;
  else showManual(pendingCoverSrc);
});

usePhotoBtn.addEventListener('click', () => showManual(pendingCoverSrc));

function showLoading(msg) {
  stopBarcodeLoop();
  matchLoadingMsg.textContent = msg;
  setModalView('loading');
}

function showError(title, msg) {
  stopBarcodeLoop();
  errorTitle.textContent = title;
  errorMsg.textContent = msg;
  setModalView('error');
}

/* Barcode first (exact), then read the cover text and search for a match. */
async function identify(source, photoSrc) {
  pendingCoverSrc = photoSrc;
  showLoading('Reading the cover…');

  const detector = await getBarcodeDetector();
  if (detector) {
    try {
      const codes = await detector.detect(source);
      const isbn = codes.map((c) => c.rawValue).find((v) => /^97[89]\d{10}$/.test(v));
      if (isbn) {
        await lookupByIsbn(isbn);
        return;
      }
    } catch { /* no barcode in frame — fall through to reading the cover */ }
  }

  let phrases = [];
  try {
    const worker = await getOcrWorker();
    // blocks:true gives per-line bounding boxes, which is how type size is read
    const { data } = await worker.recognize(source, {}, { text: true, blocks: true });
    phrases = queryFromOcr(data);
  } catch (err) {
    console.warn('OCR failed:', err);
  }

  if (!phrases.length) {
    showError(
      "We couldn't read that cover",
      'The title was hard to make out. Try again with the whole cover in frame and even lighting, or enter the details yourself.'
    );
    return;
  }

  showLoading('Searching for a match…');
  let matches = [];
  try {
    matches = (await findMatches(phrases)).matches;
  } catch (err) {
    console.warn(err);
    showError(
      'Search is unavailable',
      "We couldn't reach the book database just now. Check your connection and try again, or enter the details yourself."
    );
    return;
  }

  if (!matches.length) {
    showError(
      'No match found',
      "We read the cover but couldn't find that book. Try again, or enter the details yourself."
    );
    return;
  }

  allMatches = matches.map(normalizeMatch);
  showMatch(allMatches[0]);
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

/* ---------- Manual entry & adding ---------- */

/* The last-resort fallback: no catalogue match was accepted, so the photo
   stands in as the cover and the reader supplies the details. */
function showManual(coverSrc) {
  pendingCoverSrc = coverSrc || '';
  confirmCover.src = pendingCoverSrc;
  confirmCover.style.display = pendingCoverSrc ? '' : 'none';
  confirmTitle.value = '';
  confirmAuthor.value = '';
  setModalView('manual');
  setStatus('Add the title (and author) so the book is searchable.');
  confirmTitle.focus();
}

/* Return to the live camera from any result panel. */
function backToCapture() {
  setMode(mode);
}

retryBtn.addEventListener('click', backToCapture);
errorRetryBtn.addEventListener('click', backToCapture);
errorManualBtn.addEventListener('click', () => showManual(pendingCoverSrc));

function addBookToLibrary({ title, author, cover }) {
  books.push({
    id: `custom-${Date.now()}`,
    title: title.trim(),
    author: (author || '').trim(),
    cover,
    custom: true,
  });
  saveCustomBooks();
  buildCoverflow();
  updateEmptyState();
  selectBook(books.length - 1);
  if (currentView !== 'cover') renderBrowse();
  closeModal();
}

confirmAddBtn.addEventListener('click', () => {
  const title = confirmTitle.value.trim();
  if (!title) {
    setStatus('A title is required.', true);
    confirmTitle.focus();
    return;
  }
  addBookToLibrary({ title, author: confirmAuthor.value, cover: pendingCoverSrc });
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

applySettings();
buildCoverflow();
if (settings.defaultView && settings.defaultView !== 'cover') setView(settings.defaultView);
updateEmptyState();
moveTabIndicator({ animate: false });
