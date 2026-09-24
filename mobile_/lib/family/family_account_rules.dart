enum ExplorerAgeKind { child, teen }

/// Product ages: 0–14 child, 15+ teen. Reject nonsense values.
ExplorerAgeKind? explorerKindFromAge(int age) {
  if (age < 0 || age > 25) return null;
  if (age <= 14) return ExplorerAgeKind.child;
  return ExplorerAgeKind.teen;
}

bool canCreateOwnedFamily(String? familyId) {
  return familyId == null || familyId.isEmpty;
}

bool canIndependentlyAcceptInvite({required bool isUnderAgeExplorer}) {
  return !isUnderAgeExplorer;
}

DateTime scheduledDeletionDeadline(DateTime deletionAt) {
  return deletionAt.add(const Duration(days: 3));
}

DateTime? deletionStartedAt(Map<String, dynamic> membership) {
  final raw = membership['deletionAt'] ?? membership['deletion_at'];
  if (raw is DateTime) return raw.toUtc();
  if (raw is String && raw.isNotEmpty) {
    return DateTime.tryParse(raw)?.toUtc();
  }
  return null;
}

String groupDeletionBannerText(DateTime deadline) {
  final local = deadline.toLocal();
  final y = local.year.toString().padLeft(4, '0');
  final m = local.month.toString().padLeft(2, '0');
  final d = local.day.toString().padLeft(2, '0');
  return 'This group is scheduled for deletion.\n\n'
      'Deletion date: $y-$m-$d\n\n'
      'All members will be removed when the deletion period ends.';
}

String defaultFamilyName(String? adultName) {
  final trimmed = adultName?.trim() ?? '';
  if (trimmed.isEmpty) return 'Family';
  return "$trimmed's family";
}
