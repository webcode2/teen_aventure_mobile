# Parent group visibility

Main accounts now list groups with approved enrollments belonging to any explorer linked through family ownership or guardianship. Independent-login teens remain included while linked to that family, irrespective of who accepted their group invitation. Sibling groups are deduplicated. Pending or removed enrollments do not grant observer access.

These additional memberships are parent observers: they grant read access only, without join codes, administrative tools or permission to leave a child's group. Authorization rechecks the current relationship on each detail and leaderboard request.

Parent boards show every approved explorer, retaining full names and points for their own linked explorers. Peer rows contain only given names, a redacted zero in the numeric points field for older-client compatibility, no child id, and an explicit masking flag. Actual peer scores are not sent. Flutter renders surname and score placeholders instead of sending hidden data to the UI. Aggregate group points are also omitted for masked views. Group detail no longer truncates the roster at 50.

Both engagement and Teen Quest leaderboard APIs apply the same access and privacy rules, preventing bypass through an alternate leaderboard. Explicit teacher/ministry access continues to use its existing reporting permissions; family views keep their own household's details.
