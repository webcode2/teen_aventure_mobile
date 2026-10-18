# Ministry nudges

The ministry nudge library includes the ministry’s own templates and all active, approved system templates. Templates belonging to other ministries remain private. System templates remain read-only and available through the existing approved-template send flows.

Each ministry can submit up to 30 custom templates. All review statuses count toward the limit; shared system templates do not. At the limit, new submissions return HTTP 409. Rejected templates can still be edited and resubmitted using their existing slot. Existing ministries above the limit keep their records but cannot submit another template.

Creation locks the ministry row in a database transaction before counting and inserting, preventing concurrent submissions from exceeding the limit. The portal displays custom usage and disables new submissions at the limit. This cap applies to template creation, not the number of times an approved nudge can be sent.
