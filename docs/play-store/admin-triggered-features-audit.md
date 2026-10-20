# Admin-triggered and conditional UI audit

Scope: source review of UI that may be absent until content, role or administrative state changes. No live admin switches were changed.

Google Play prohibits hidden, dormant or undocumented features and behavior that conceals functionality during review. Conditional content should be described accurately and reviewers must be able to exercise it. Source: https://support.google.com/googleplay/android-developer/answer/17006354

## Findings

| Surface | Source behavior | Finding |
| --- | --- | --- |
| Home announcement | `HomeAnnouncementBanner` returns `SizedBox.shrink()` when not visible; content comes from `/api/content/mobile` | Hidden state creates no banner animation. Enabled overflow text runs a repeating animation. Provide enabled and disabled review/test cases. |
| Announcement defaults | Flutter, backend and CMS defaults enable the welcome announcement | This is not strictly admin-triggered: a clean installation can show the built-in announcement without a successful content fetch. Confirm whether that default is intended. |
| Announcement action | CMS controls action label; mobile always calls `WeekQuestFlow.openNext` when a current quest exists | A custom label can promise an unrelated destination; it does not configure an arbitrary action URL. Without a current quest, the label can still display with no working action. Align allowed labels/actions and disable or hide unavailable calls to action. |
| Content refresh | Controller refreshes on creation and explorer pull-to-refresh; it retains cached copy on failure | Admin changes are not guaranteed to appear immediately in an already-open app. Cached enabled content can survive an offline disable. No expiry/instant revocation guarantee was found in this path. |
| Maintenance / minimum version | CMS/backend define `maintenanceMode`, message and `minVersion`; no consumer for these keys was found under `mobile_/lib` | Dashboard configuration/preview does not establish a working native maintenance or forced-update screen. Do not rely on these controls as an operational kill switch. |
| Objective Quiz activation | Teacher UI exposes activation/deactivation; activation records include active state | Conditional educational functionality needs a populated review account/group and documented activation steps. Full role/activation runtime matrix remains to be tested. |
| Nudges / notifications | Inbox content appears when a message exists; push/inbox paths depend on registration and account state | Provide a safe sample nudge and test foreground, background, cold-start and permission-denied states. Do not treat an empty inbox as evidence the feature is absent. |
| Legal/resource pages | Dashboard-configured links open in webviews | Review the actual linked content and its changes; a disabled or missing page must not make mandatory disclosures unavailable. |

## Review preparation

Document all remotely controlled surfaces in Play Console app-access instructions, with valid review accounts and steps to reach populated states. Keep review and production behavior consistent. Test enabled, disabled, empty, malformed, offline/cached and role-restricted states on the release build. This source review is not a certification of every server-driven path or a Play policy approval.

## Official-policy verification — 18 October 2026

The policy does not state that every widget must always be displayed. The distinction is between disclosed conditional functionality and hidden/undocumented functionality. This is an interpretation of the requirements below, not an explicit exemption or a guarantee of approval.

- **Behavior Transparency, section 5:** prohibits hidden, dormant or undocumented functionality and review evasion. Its guidance explicitly addresses undocumented remote activation. Announcements, quiz activation and notifications should be explained as normal functionality; enabling them after review must not reveal an undisclosed product purpose. https://support.google.com/googleplay/android-developer/answer/17006354?hl=en
- **Prepare your app for review — Sign-in details:** provide everything necessary to access restricted functionality. Supply persistent, populated accounts and instructions for role/group/activation-dependent states; reviewers should not have to wait for an operator to activate content. https://support.google.com/googleplay/android-developer/answer/9859455?hl=en
- **Store metadata:** descriptions/screenshots must accurately represent behavior. Describe weekly lessons, group-activated quizzes, notifications and announcements without implying all users always see them. An editable CTA must accurately describe its actual destination. https://support.google.com/googleplay/android-developer/answer/17006354?hl=en
- **User Data and account deletion:** declarations apply to the complete app and SDK behavior, including conditional features. Accurate privacy disclosures and functional deletion cannot be omitted because a relevant screen is usually hidden. https://support.google.com/googleplay/android-developer/answer/10144311?hl=en ; https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- **Audience:** target ages must match the intended experience. Including children triggers Families requirements. Remote content and linked content need review for that audience. https://support.google.com/googleplay/android-developer/answer/9867159?hl=en
- **UGC:** user-contributed content visible to even a subset of users can be UGC. Closed groups are not an automatic exemption. The policy distinguishes closed verified communities (report content/users), 1:1 interactions (blocking), and public UGC (reporting and blocking). Assess actual profile/group/message surfaces rather than assuming every private group requires the same controls or that pre-approval alone guarantees compliance. https://support.google.com/googleplay/android-developer/answer/9876937?hl=en

Recommended release approach: keep useful conditional widgets, document their conditions, provide reviewers representative populated states without review-specific behavior, and fix misleading or nonfunctional controls. Missing maintenance/minimum-version consumers are implementation gaps, not by themselves proof of a hidden-feature policy violation. Cached announcements are an operational limitation, not automatically a Play policy violation. No policy approval or exhaustive runtime certification is claimed by this audit.
