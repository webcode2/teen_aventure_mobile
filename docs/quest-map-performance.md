# Quest map mobile rendering — 17 October 2026

The previous renderer moved a 1000 × 24000 CSS-pixel world with full-height masks, an SVG blur filter, overlapping masked artwork and continuous firefly animations. Phone screenshots showed missing rectangular tiles and partial markers during panning. GPU/compositor pressure is a plausible cause; temperature and GPU traces were not collected on the affected device.

The replacement has one opaque viewport-sized Canvas2D surface. Its backing resolution is capped at 1.5 device pixels per CSS pixel, or 1 on devices reporting up to four cores or 4 GB memory. The illustrated texture is decoded once at 512 × 768 (about 97 KB compressed, 1.5 MiB decoded RGBA). A small cached upright tile is edge-blended once after image decoding; repeats are never mirrored, so trees and landmarks stay upright. Only viewport-intersecting image tiles and trail segments are drawn. Offscreen DOM marker buttons are hidden; visible markers stay at a fixed accessible size.

Painting is requested only for input, changed quest data, image readiness, resizing or returning to the document. Input events share one pending animation frame. There is no animation loop while idle. Hidden documents cancel pending rendering. No filters, CSS masks, animated lights, or giant transformed scene layer remain.

The smaller header and 44-pixel controls fit 320-pixel screens. Simple view skips artwork drawing and remembers the preference when local storage is available; devices reporting 2 GB memory or less start in this mode. Pan, pinch, zoom buttons, endpoint jumps, keyboard controls and native/web message bridges are retained.

Verification:

- `node mobile_/test/quest_map_renderer_test.cjs`: standard and limited-device profiles; canvas size bounds, visible-only tile/marker work, no idle loop, input frame coalescing, both endpoints, simple view and hidden-page suspension.
- `cd mobile_ && flutter test --no-pub test/quest_map_document_test.dart test/level_map_data_test.dart`: bundled document and all level coordinates.
- Browser preview at 320 × 568 CSS pixels: scenery rendering, compact controls and Quest 52 access.

Before declaring the overheating resolved, install a rebuilt release APK on the affected phone and compare sustained panning, pinch zoom and idle temperature/frame pacing. A browser preview does not establish Android GPU behavior or thermal improvement. Old installed APKs still contain the old renderer until rebuilt/reinstalled.
