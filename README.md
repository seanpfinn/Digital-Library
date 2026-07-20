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
    is read on-device with Tesseract, searched against Open Library, and you
    pick from the matches. The publisher's artwork and metadata are used, not
    your photo. Falls back to manual entry with your photo if nothing matches.
- **Remove a book** — open its tray and use *Remove from library* (tap twice to
  confirm). Removing a built-in book is remembered across reloads.
  - If no camera is available, an image-upload fallback appears (it also tries
    to read a barcode from the uploaded photo).
- Added books persist in `localStorage`.

## Notes

- Cover art in `covers/` is ~1200px artwork from the iTunes Search API. If you
  replace a file in `covers/`, bump `COVER_VERSION` in [app.js](app.js) so
  browsers don't keep serving the cached copy.
- The nav tabs (Explore / Collection / List / Settings) are styled per the
  design but only Collection has content behind it.
- `assets/vendor/` holds Tesseract's wasm core and English data (~6.5MB). It is
  fetched only the first time a cover needs reading, never on page load.
- The OpenGraph tags use **relative** image paths. Most scrapers require an
  absolute URL, so set these to the full `https://…/assets/og-image.png` when
  you deploy.
- Live barcode detection uses the `BarcodeDetector` API (Chromium browsers).
  Safari/Firefox fall back to manual ISBN entry, which uses the same Open
  Library lookup.
