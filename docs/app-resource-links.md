# App legal and resource links

App content → Legal & resource links configures Privacy Policy, Terms & Conditions, Data Collection, About, and Contact & Support. Relative paths resolve against the app's website (`WEB_BASE_URL`, default `https://teen.elastrocloud.com`). Full HTTP/HTTPS links are supported; use HTTPS for released apps. Defaults reference `/p/privacy-policy`, `/p/terms-of-service`, `/p/data-collection`, `/about`, and `/contact`.

Registration and account privacy/terms screens load these links in an embedded webview. Account also offers Data Collection, About, and Contact & Support. Opening a resource refreshes CMS configuration; cached links remain available offline. The old, inaccurate static policy text has been removed. Native webviews show a retry action on navigation/network failure.

Dashboard overview, Site pages, and App content alert administrators to missing, unpublished, or invalid local app resources. The check uses actual saved app links plus defaults, understands public privacy/terms aliases, and does not fetch arbitrary external URLs. External links need manual verification, including whether the website allows embedding in Flutter web.

Before deleting a site page, its usage is loaded and the confirmation names the app consumers. The DELETE API rejects an in-use page with HTTP 409 unless the request explicitly includes `confirmInUse=true`. Deleting a linked page deliberately leaves its link visible in resource alerts until the admin relinks or restores it. Missing checks also catch pages unpublished or renamed after being linked. No existing policy content is overwritten or seeded.
