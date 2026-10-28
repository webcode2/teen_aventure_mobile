# Mascot spelling: Zach

Canonical display name, source identifiers, CMS keys and bundled image filenames
use Zach / zach. Both website assets and mobile assets are named zach.png.
Saved local and production PlatformContent documents were normalized in place;
no accounts, ministry records, scoring or private uploads were modified.

Compatibility-only old spellings intentionally remain in the content normalizer,
API upload alias, old static-image redirect, mobile cache reader and regression
tests. Historical uploaded URLs are preserved exactly. The mobile API temporarily
emits the old hero image key alongside zachUrl so existing installed apps keep
loading their images. New mobile builds write the canonical cache fields.

Public snapshots are republished from normalized content; reads still use R2.
Mobile source and assets require a new mobile app build for distribution.
