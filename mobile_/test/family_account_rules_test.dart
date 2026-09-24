import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/family/family_account_rules.dart';

void main() {
  group('explorerKindFromAge', () {
    test('ages 0–14 are CHILD', () {
      expect(explorerKindFromAge(0), ExplorerAgeKind.child);
      expect(explorerKindFromAge(14), ExplorerAgeKind.child);
    });

    test('ages 15+ are TEEN', () {
      expect(explorerKindFromAge(15), ExplorerAgeKind.teen);
      expect(explorerKindFromAge(19), ExplorerAgeKind.teen);
    });

    test('rejects invalid ages', () {
      expect(explorerKindFromAge(-1), isNull);
      expect(explorerKindFromAge(120), isNull);
    });
  });

  group('family creation', () {
    test('adult without a family may create one', () {
      expect(canCreateOwnedFamily(null), isTrue);
      expect(canCreateOwnedFamily(''), isTrue);
    });

    test('adult who already has a family must not create another', () {
      expect(canCreateOwnedFamily('fam-1'), isFalse);
    });
  });

  group('invites', () {
    test('0–14 children cannot independently join groups', () {
      expect(canIndependentlyAcceptInvite(isUnderAgeExplorer: true), isFalse);
    });

    test('independent teens can accept invites', () {
      expect(canIndependentlyAcceptInvite(isUnderAgeExplorer: false), isTrue);
    });
  });

  group('group deletion deadline', () {
    test('schedules deletion three days after deletionAt', () {
      final started = DateTime.utc(2026, 9, 19);
      expect(
        scheduledDeletionDeadline(started),
        DateTime.utc(2026, 9, 22),
      );
    });

    test('reads deletionAt from membership payload when present', () {
      final started = DateTime.utc(2026, 9, 19, 8);
      final at = deletionStartedAt({
        'deletionPending': true,
        'deletionAt': started.toIso8601String(),
      });
      expect(at, started);
    });
  });
}
