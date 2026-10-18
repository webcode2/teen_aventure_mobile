# Web and app content studio

Dashboard routes: `/app/dashboard/content-web` and `/app/dashboard/content-mobile`.

The website editor covers the landing hero and mascot image URLs, CTA labels/destinations, header strip, pillars, mission/benefits, onboarding steps, safeguarding, footer, About text, Contact text/addresses/placeholders, FAQs, and landing-section visibility. Search works across sections, field names, and text. Benefits, steps, and FAQs support adding, removing, and reordering items.

The app editor retains the existing hero/image upload, announcement and welcome controls and adds home activity labels, navigation labels and quest-map labels (including the finish sign). Quiz and puzzle success messages are now consumed by the corresponding app screens. Navigation, home and quest text is cached for offline use. Updated app binaries are required to consume these new fields.

Pillars and version/maintenance settings are retained from the existing document. This change does not introduce a maintenance/version enforcement engine or convert every app workflow dialog to remotely managed text. Legal document bodies continue to use their separate editor. The content studio does not change scoring, account-age rules, auth, or safeguarding behavior.

Edits are unpublished browser drafts until Save changes succeeds. Drafts recover on reopening, Undo/Redo keeps up to 40 changes, and Reset this section affects only the selected section until saved. JSON exports include platform and content; imports must match the active platform and remain drafts for review. Failed server saves are errors, not publication successes. A failed initial read blocks saving so defaults cannot overwrite live content. There are no new database migrations or live content changes in this implementation.

Verification: CMS/public content/dashboard tests cover server load/save failures, draft recovery, nested defaults, list editing, search, visibility, real public-page consumption, and safe URLs. Flutter tests cover offline cached copy and existing home/quest progress. Renderer regression checks preserve viewport-only drawing and idle sleep.
