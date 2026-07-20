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
  or drag to flip through the shelf. Each cover has a mirrored reflection.
- **Library dropdown** — the pill at the top lists every book for a quick jump.
- **Add book** (bottom-right button):
  - **Scan ISBN** — point the camera at the barcode on the back of a book; the
    ISBN is detected live (Chrome/Edge; other browsers can type the ISBN) and the
    title, author, and cover art are fetched from Open Library.
  - **Photo of cover** — snap the front cover and it becomes the book's cover
    art; add the title/author yourself.
  - If no camera is available, an image-upload fallback appears (it also tries
    to read a barcode from the uploaded photo).
- Added books persist in `localStorage`.

## Notes

- Cover art in `covers/` comes from Open Library. The Creative Act only has a
  low-resolution scan available there.
- Live barcode detection uses the `BarcodeDetector` API (Chromium browsers).
  Safari/Firefox fall back to manual ISBN entry, which uses the same Open
  Library lookup.
