class QuestMilestone {
  const QuestMilestone({
    required this.title,
    required this.criteria,
    required this.weekComplete,
    this.id,
  });

  final String title;
  final String criteria;
  /// Earned after this week’s tasks are done. From the partial client table only.
  final int weekComplete;
  /// Server award id; null for the built-in fallback list.
  final String? id;
}

/// An award saved on the server for one person, as it was when they earned it.
class EarnedAward {
  const EarnedAward({this.awardId, required this.title, required this.weekNumber, this.earnedAt});

  final String? awardId;
  final String title;
  final int weekNumber;
  final DateTime? earnedAt;

  factory EarnedAward.fromJson(Map<String, dynamic> json) => EarnedAward(
        awardId: json['awardId'] as String?,
        title: json['title'] as String? ?? '',
        weekNumber: (json['weekNumber'] as num?)?.toInt() ?? 0,
        earnedAt: json['earnedAt'] is String ? DateTime.tryParse(json['earnedAt'] as String) : null,
      );
}

/// Badges to show for one person: every current award (earned or locked), plus
/// awards they earned that staff have since removed. Without a server record
/// ([earned] null, older API) it falls back to weeks completed.
List<({QuestMilestone milestone, bool earned})> awardStates(
  List<QuestMilestone> awards, {
  required int weeksCompleted,
  List<EarnedAward>? earned,
}) {
  if (earned == null) {
    return [
      for (final m in awards) (milestone: m, earned: weeksCompleted >= m.weekComplete),
    ];
  }
  bool has(QuestMilestone m) => earned.any(
        (e) => m.id != null ? e.awardId == m.id : e.title == m.title,
      );
  final ids = {for (final m in awards) if (m.id != null) m.id};
  final removed = [
    for (final e in earned)
      if (e.awardId == null || !ids.contains(e.awardId))
        if (!awards.any((m) => m.id == null && m.title == e.title))
          QuestMilestone(title: e.title, criteria: '', weekComplete: e.weekNumber, id: e.awardId),
  ];
  final rows = [
    for (final m in awards) (milestone: m, earned: has(m)),
    for (final m in removed) (milestone: m, earned: true),
  ]..sort((a, b) => a.milestone.weekComplete.compareTo(b.milestone.weekComplete));
  return rows;
}

/// The awards shown on the profile, in milestone order.
List<({QuestMilestone milestone, bool earned})> profileAwardPreview(
  List<({QuestMilestone milestone, bool earned})> awards,
) {
  final currentIndex = awards.lastIndexWhere((award) => award.earned);
  if (currentIndex <= 0) return awards.take(3).toList();

  final previous = awards.take(currentIndex).where((award) => award.earned).lastOrNull;
  final next = awards.skip(currentIndex + 1).firstOrNull;
  return [
    if (previous != null) previous,
    awards[currentIndex],
    if (next != null) next,
  ];
}

/// Titles with stated criteria in the client review. Later titles stay unpublished.
const knownQuestMilestones = [
  QuestMilestone(
    title: 'New Quester',
    criteria: 'Week 1 complete',
    weekComplete: 1,
  ),
  QuestMilestone(
    title: 'Ardent Reader',
    criteria: 'Week 2 complete',
    weekComplete: 2,
  ),
  QuestMilestone(
    title: 'Great Follower',
    criteria: 'Week 6 complete',
    weekComplete: 6,
  ),
];

List<QuestMilestone> milestonesOrFallback(List<QuestMilestone>? milestones) {
  if (milestones == null || milestones.isEmpty) return knownQuestMilestones;
  final rows = [...milestones]..sort((a, b) => a.weekComplete.compareTo(b.weekComplete));
  return rows;
}

/// The badge already earned. A new explorer has none until the first level's weeks are finished.
QuestMilestone? latestMilestone(int weeksCompleted, [List<QuestMilestone>? milestones]) {
  QuestMilestone? latest;
  for (final row in milestonesOrFallback(milestones)) {
    if (weeksCompleted >= row.weekComplete) latest = row;
  }
  return latest;
}

QuestMilestone? nextMilestone(int weeksCompleted, [List<QuestMilestone>? milestones]) {
  for (final row in milestonesOrFallback(milestones)) {
    if (weeksCompleted < row.weekComplete) return row;
  }
  return null;
}

String nextMilestoneLine(int weeksCompleted) {
  final next = nextMilestone(weeksCompleted);
  if (next == null) return 'Latest published title earned. Keep walking.';
  return '${next.title} · ${next.criteria}';
}

