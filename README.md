# Digital Library

A Cover Flow digital bookshelf, built from the [Figma design](https://www.figma.com/design/agUBgCwyG1WgWcgTsY2Zz4/Digital-Library?node-id=1-47).

## Run it

The camera features require a secure context, so serve the folder over localhost
(don't open `index.html` directly from the Finder):

```sh
cd ~/Desktop/Digital-Library
python3 -m http.server 8734
```

Then open <http://localhost:8734>.

## Accounts

- On first load you get a **sign-in / sign-up splash**. Accounts and the current
  session live in `localStorage`; passwords are SHA-256 hashed so they aren't
  stored in the clear.
  - ⚠️ This is a **client-side placeholder** for real auth — it exists so the UI
    and per-user data model are in place. Swapping in a real backend means
    turning `Auth`'s methods into API calls; no other code needs to change.
  - **Accounts do not sync across devices** (they live in each browser's
    `localStorage`). An account created on your computer will not exist on your
    phone — that only works once there's a real backend. Passwords are hashed
    with a portable hash so same-device sign-in works whether the page is opened
    via `localhost` or a `http://<ip>` address.
- **All library data is namespaced per user** (`dl:{userId}:library`, `…:lists`,
  `…:read`, `…:settings`), so each account is isolated and the layout maps
  cleanly onto a `user_id`-keyed database later.
- The header **avatar** opens a **Profile** page: name (editable), email, join
  date, per-collection-type counts, read/list totals, and **Sign out**.
- **Four wired collections** — **Books, Movies, TV Shows, and Games**. There is
  no global filter; instead **Explore, Collection, and List each have their own
  category sub-nav**. Collection and List include an **All** option (mixed
  types); Explore picks one type to discover. Selections persist per account.
- **Theme** — Settings → Appearance offers **Light / Dark / Auto** (Auto follows
  the device). The whole UI is tokenised, so it themes cleanly; the choice is a
  device-level preference applied before sign-in (so the splash is themed too).
  - **Discovery is keyless** (no API keys needed): Books → Open Library,
    TV → TVmaze, Games → CheapShark (Steam art), Movies → iTunes best-effort.
  - Any collection can also be built by hand: the **Add** button opens a quick
    manual form (title, creator, cover URL) for non-book types, while Books keep
    the full scan/photo/ISBN flow.
  - The tray adapts per type: read-status labels (Read / Watched / Played) and
    where-to-get links (retailers / JustWatch+IMDb / Steam+Metacritic).
  - Items without artwork fall back to a typed placeholder cover.

## Features

- **Cover Flow** — click a side cover, use ←/→ arrow keys, scroll/trackpad-swipe,
  or drag to flip through the shelf. The shelf loops continuously, and each cover
  has a mirrored reflection.
- **Three views** — the toggles at the right of the nav row switch between cover
  flow, list, and grid. Clicking any book in list/grid jumps to it in the flow.
- **Search** — filters the list and grid; in cover view it jumps to the first match.
- **Detail tray** — clicking the centre cover (or any book in list/grid) slides a
  glass tray up with the synopsis and links to buy or borrow. Dismiss with the
  grip, the scrim, Escape, or by swiping it down. The retailer links are
  *searches* built from title + author, not hardcoded product pages, so they
  don't rot or land on the wrong edition.
- **Add book** (header button):
  - **Scan ISBN** — point the camera at the barcode on the back of a book; the
    ISBN is detected live (Chrome/Edge; other browsers can type the ISBN) and the
    title, author, and cover art are fetched from Open Library.
  - **Photo of cover** — snap the front cover and it is *identified*: the text
    is read on-device with Tesseract and searched against Open Library. The
    modal then shows a **confirmation** of the matched book with its hi-res
    publisher artwork — "Is this your book?" — before anything is added. The
    photo is only a reference; the book is stored with the catalogue cover and
    metadata, never the snapshot. "Not the right book" reveals the other
    matches; if none fit, you fall back to manual entry with your photo.
  - Every failure (unreadable cover, no match, network down, bad ISBN) lands on
    a single tasteful **error state** with a retry and a manual-entry option.
- **Remove a book** — open its tray and use *Remove from library* (tap twice to
  confirm). Removing a built-in book is remembered across reloads.
- **Read / Unread** — each book's tray has an Unread/Read toggle. Read books show
  a blue check badge on their cover in the grid, Explore, and List views.
- **Lists** — from a book's tray, *Add to list* toggles it into any list or
  creates a new one. The **List** tab shows every list with its books; create
  and delete lists there too. Read state and list membership persist in
  `localStorage` and are cleaned up when a book is removed.
  - If no camera is available, an image-upload fallback appears (it also tries
    to read a barcode from the uploaded photo).
- Added books persist in `localStorage`.

## Notes

- Cover art in `covers/` is ~1200px artwork from the iTunes Search API. If you
  replace a file in `covers/`, bump `COVER_VERSION` in [app.js](app.js) so
  browsers don't keep serving the cached copy.
- The nav tabs now switch top-level content:
  - **Explore** — live discovery from the **Open Library** API: a trending hero,
    a "Trending this week" row, and curated themed rows (Product & Startups,
    Focus & Deep Work, Design & Creativity) resolved from seed titles. Each card
    has **+ Add** to pull the book — with its hi-res cover and a fetched
    synopsis — into your collection; clicking it again **removes** the book.
    Tapping a cover or title opens a **preview** (details + synopsis) without
    adding it. Owned books show **✓ In library**. Results are cached per
    session; failures show a retry. No API key needed.
  - **Collection** — the Cover Flow shelf and its list/grid views (unchanged).
  - **List** — a placeholder empty state for now; the reading-list UX is next.
  - **Settings** — real, persisted preferences: default Collection view,
    cover-reflection toggle, reduce-motion toggle, a library count, restore
    removed originals, and a reset. Stored in `localStorage`.
- `assets/vendor/` holds Tesseract's wasm core and English data (~6.5MB). It is
  fetched only the first time a cover needs reading, never on page load.
- The OpenGraph tags use **relative** image paths. Most scrapers require an
  absolute URL, so set these to the full `https://…/assets/og-image.png` when
  you deploy.
- Live barcode detection uses the `BarcodeDetector` API (Chromium browsers).
  Safari/Firefox fall back to manual ISBN entry, which uses the same Open
  Library lookup.
