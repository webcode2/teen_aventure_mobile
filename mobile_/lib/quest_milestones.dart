class QuestMilestone {
  const QuestMilestone({
    required this.title,
    required this.criteria,
    required this.weekComplete,
  });

  final String title;
  final String criteria;
  /// Earned after this week’s tasks are done. From the partial client table only.
  final int weekComplete;
}

/// Titles with stated criteria in the client review. Later titles stay unpublished.
const knownQuestMilestones = [
  QuestMilestone(
    title: 'New Quester',
    criteria: 'Starting the quest',
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

String nextBigWinLine({
  required int weeksCompleted,
  required int sessionsDone,
  int sessionsTotal = 5,
}) {
  final last = knownQuestMilestones.last;
  if (weeksCompleted < last.weekComplete) {
    return '${last.title} · ${last.criteria}';
  }
  if (sessionsDone < sessionsTotal) {
    return 'Stamp this week’s seal';
  }
  return 'Keep walking — later titles stay unpublished until earned.';
}

String profileMilestoneLine({required String name, required int weeksCompleted}) {
  final title = latestMilestone(weeksCompleted)?.title;
  if (title == null) return name;
  return '$name, $title';
}

String milestoneBrief({
  required int weeksCompleted,
  required int sessionsDone,
  int sessionsTotal = 5,
}) {
  final earned = latestMilestone(weeksCompleted);
  if (earned == null) {
    final goal = nextMilestone(weeksCompleted)?.title ?? 'your first badge';
    if (sessionsDone <= 0) {
      return 'No badge yet. Finish this week’s activities to earn $goal.';
    }
    if (sessionsDone >= sessionsTotal) {
      return 'This week is sealed. $goal unlocks when its weeks are finished.';
    }
    final left = sessionsTotal - sessionsDone;
    return 'No badge yet. $left session${left == 1 ? '' : 's'} left this week toward $goal.';
  }
  final criteria = earned.criteria;
  if (sessionsDone >= sessionsTotal) {
    return '$criteria. This week is sealed — well done, Explorer!';
  }
  if (sessionsDone <= 0) {
    return '$criteria. Start today’s quest and stamp your week seal.';
  }
  final left = sessionsTotal - sessionsDone;
  return '$criteria. $left session${left == 1 ? '' : 's'} left this week. Keep going!';
}

QuestMilestone? milestoneAtWeek(int week) {
  for (final row in knownQuestMilestones) {
    if (row.weekComplete == week) return row;
  }
  return null;
}

/// Week stops from the first title through the last published title.
List<int> questJourneyWeeks() {
  final last = knownQuestMilestones.last.weekComplete;
  return [for (var week = 0; week <= last; week++) week];
}

int currentJourneyIndex(int weeksCompleted) {
  final weeks = questJourneyWeeks();
  var index = 0;
  for (var i = 0; i < weeks.length; i++) {
    if (weeksCompleted >= weeks[i]) index = i;
  }
  return index;
}
