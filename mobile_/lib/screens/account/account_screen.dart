import 'individual_account_deletion_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../providers/current_quest_provider.dart';
import '../../quest_milestones.dart';
import '../../services/api_client.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';
import 'devices_screen.dart';
import 'profile_edit_screen.dart';
import '../auth/child_pin_screen.dart';
import '../auth/child_teen_login_screen.dart';
import '../family/family_screen.dart';
import '../groups/groups_screen.dart';
import '../teen/achievements_screen.dart';
import '../shared/widgets/adventure_list_card.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({super.key});

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _busy = false;

  Future<void> _restoreParent() async {
    setState(() => _busy = true);
    try {
      await context.read<AuthSession>().restoreParentAccount();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: AppColors.navy),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openPersonalInfo(AuthSession session) {
    if (session.canEditProfile) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const ProfileEditScreen()),
      );
      return;
    }
    final lines = <String>[
      session.accountKindLabel,
      if (session.email != null && session.email!.isNotEmpty) session.email!,
      if (session.ageBand != null) session.ageBand!,
      if (session.familyId != null) 'Linked family',
    ];
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.cream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Personal info',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
            ),
            const SizedBox(height: 12),
            for (final line in lines) ...[
              Text(
                line,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  height: 1.5,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final name = session.displayName?.trim().isNotEmpty == true
        ? session.displayName!
        : 'Explorer';
    final firstName = name.split(' ').first;
    var weeksCompleted = 0;
    var sessionsDone = 0;
    var points = 0;
    try {
      final game = context.watch<GameController>();
      sessionsDone = game.weekQuest.completed;
      points = game.score;
    } catch (_) {}
    try {
      weeksCompleted = context.watch<CurrentQuestProvider>().current?.weeksCompleted ?? 0;
    } catch (_) {}
    final showQuestMilestone = session.isChild;

    return Material(
      color: AppColors.cream,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
        children: [
  const SizedBox(height: 22),
          _ProfileHeroCard(
            name: name,
            role: session.accountKindLabel,
            milestoneLine: showQuestMilestone
                ? profileMilestoneLine(name: firstName, weeksCompleted: weeksCompleted)
                : null,
            weeksCompleted: weeksCompleted,
            points: points,
            onPersonalInfo: session.canEditProfile ? () => _openPersonalInfo(session) : null,
            onViewAllAchievements: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const AchievementsScreen()),
              );
            },
          ),
          if (session.canRestoreParent) ...[
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _busy ? null : _restoreParent,
              icon: const Icon(Icons.switch_account_rounded),
              label: Text(_busy ? 'Switching…' : 'Back to parent account'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.navy,
                foregroundColor: AppColors.cream,
              ),
            ),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _FeatureTile(
                  badge: showQuestMilestone && sessionsDone == 0 ? 'New' : null,
                  title: 'Groups',
                  subtitle: 'Join groups and see your standing',
                  icon: Icons.groups_rounded,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const GroupsScreen(showRanks: true)),
                    );
                  },
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: _FeatureTile(
                  title: session.isAdult ? 'Family' : 'Achievements',
                  subtitle: session.isAdult
                      ? 'Manage your home explorers'
                      : 'See badges and milestones',
                  icon: session.isAdult
                      ? Icons.family_restroom_rounded
                      : Icons.emoji_events_rounded,
                  onTap: () {
                    if (session.isAdult) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const FamilyScreen()),
                      );
                    } else {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const AchievementsScreen()),
                      );
                    }
                  },
                ),
              ),
            ],
          ),
          if (session.isParent && session.children.isNotEmpty) ...[
            const SizedBox(height: 28),
            // TODO: one child  then call it child profile, and if 2 orr more then call it children profiles
            const Text(
              'Children profiles',
              style: TextStyle(
                color: AppColors.navy,
                fontWeight: FontWeight.w900,
                fontSize: 16,
              ),
            ),
            const SizedBox(height: 10),
          
            const SizedBox(height: 16),
            for (final child in session.children) ...[
              _ChildSwitchTile(
                child: child,
                busy: _busy,
                onSwitch: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => child.usesEmailPasswordSwitch
                          ? ChildTeenLoginScreen(
                              childId: child.id,
                              childName: child.name,
                              email: child.email,
                            )
                          : ChildPinScreen(
                              childId: child.id,
                              childName: child.name,
                              useParentSwitch: child.isUnderAge,
                            ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 12),
            ],
          ],
          const SizedBox(height: 32),
          const Text(
            'Settings',
            style: TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w900,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 16),
          if (session.canEditProfile)
            _SettingsTile(
              icon: Icons.person_outline_rounded,
              title: 'Personal info',
              actionLabel: 'Edit',
              onTap: () => _openPersonalInfo(session),
            ),
          if (session.canEditProfile) const SizedBox(height: 12),
          _SettingsTile(
            icon: Icons.devices_rounded,
            title: 'Devices',
            actionLabel: 'Manage',
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const DevicesScreen()),
              );
            },
          ),
          if (session.isAdult) ...[
            const SizedBox(height: 12),
            _SettingsTile(
              icon: Icons.family_restroom_rounded,
              title: session.needsFamilySetup ? 'Create or join a family' : 'Family',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const FamilyScreen()),
                );
              },
            ),
          ],
          if (!session.isUnderAgeExplorer) ...[
            const SizedBox(height: 12),
            _SettingsTile(
              icon: Icons.delete_forever_outlined,
              title: 'Account deletion & recovery',
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const IndividualAccountDeletionScreen()),
                );
              },
            ),
          ],
        ],
      ),
    );
  }
}

class _ProfileHeroCard extends StatelessWidget {
  const _ProfileHeroCard({
    required this.name,
    required this.role,
    required this.weeksCompleted,
    required this.points,
    required this.onViewAllAchievements,
    this.onPersonalInfo,
    this.milestoneLine,
  });

  final String name;
  final String role;
  final String? milestoneLine;
  final int weeksCompleted;
  final int points;
  final VoidCallback? onPersonalInfo;
  final VoidCallback onViewAllAchievements;

  @override
  Widget build(BuildContext context) {
    final title = milestoneLine ?? name;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.06),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          SizedBox(
            width: 96,
            height: 96,
            child: Stack(
              alignment: Alignment.center,
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.orange.withValues(alpha: 0.16),
                  ),
                ),
                CircleAvatar(
                  radius: 36,
                  backgroundColor: AppColors.navy,
                  child: Text(
                    name.isEmpty ? '?' : name[0].toUpperCase(),
                    style: const TextStyle(
                      color: AppColors.cream,
                      fontWeight: FontWeight.w900,
                      fontSize: 28,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Stack(
            alignment: Alignment.center,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 44),
                child: Column(
                  children: [
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                        height: 1.15,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      role,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
              Positioned(
                right: 0,
                top: 0,
                child: onPersonalInfo == null
                    ? const SizedBox(width: 40, height: 40)
                    : Material(
                        color: AppColors.cream,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: onPersonalInfo,
                          child: const SizedBox(
                            width: 40,
                            height: 40,
                            child: Icon(Icons.edit_outlined, color: AppColors.navy, size: 18),
                          ),
                        ),
                      ),
              ),
            ],
          ),
          const SizedBox(height: 28),
          _ProfileAchievementsRow(
            weeksCompleted: weeksCompleted,
            points: points,
            onViewAll: onViewAllAchievements,
          ),
          const SizedBox(height: 28),
          const _ProfileStatsPanel(),
        ],
      ),
    );
  }
}

class _ProfileAchievementsRow extends StatelessWidget {
  const _ProfileAchievementsRow({
    required this.weeksCompleted,
    required this.points,
    required this.onViewAll,
  });

  final int weeksCompleted;
  final int points;
  final VoidCallback onViewAll;

  @override
  Widget build(BuildContext context) {
    final badges = <({String label, IconData icon, Color color, bool earned})>[
      for (final m in knownQuestMilestones)
        (
          label: m.title,
          icon: Icons.workspace_premium_rounded,
          color: AppColors.teal,
          earned: weeksCompleted >= m.weekComplete,
        ),
      (
        label: points >= 1000 ? '1,000 pts' : '$points pts',
        icon: Icons.stars_rounded,
        color: AppColors.gold,
        earned: points > 0,
      ),
    ];

    return Column(
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'ACHIEVEMENTS',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  letterSpacing: 0.6,
                ),
              ),
            ),
            TextButton(
              onPressed: onViewAll,
              style: TextButton.styleFrom(
                foregroundColor: AppColors.teal,
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text(
                'View All >',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            for (final badge in badges.take(4))
              Expanded(
                child: Column(
                  children: [
                    Opacity(
                      opacity: badge.earned ? 1 : 0.35,
                      child: Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: badge.color.withValues(alpha: 0.14),
                        ),
                        child: Icon(badge.icon, color: badge.color, size: 26),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      badge.label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: badge.earned ? AppColors.navy : AppColors.textMuted,
                        fontWeight: FontWeight.w700,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ],
    );
  }
}

enum _StatsRange { week, month, year }

class _ProfileStatsPanel extends StatefulWidget {
  const _ProfileStatsPanel();

  @override
  State<_ProfileStatsPanel> createState() => _ProfileStatsPanelState();
}

class _ProfileStatsPanelState extends State<_ProfileStatsPanel> {
  _StatsRange _range = _StatsRange.month;
  final Map<String, ActivitySeries> _loaded = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    final range = _range.name;
    if (_loaded.containsKey(range)) {
      if (_loading || _error != null) {
        setState(() {
          _loading = false;
          _error = null;
        });
      }
      return;
    }
    if (!_loading || _error != null) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final series = await context.read<EngagementService>().getActivityStats(range);
      if (!mounted || _range.name != range) return;
      setState(() {
        _loaded[range] = series;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || _range.name != range) return;
      setState(() {
        _loading = false;
        _error = 'Activity could not load';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final series = _loaded[_range.name];
    final values = series?.points ?? const <int>[];
    final labels = series?.labels ?? const <String>[];
    final max = values.fold<int>(0, (top, n) => n > top ? n : top);
    final total = series?.total ?? 0;

    return Column(
      children: [
        const Align(
          alignment: Alignment.centerLeft,
          child: Text(
            'STATS',
            style: TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w800,
              fontSize: 12,
              letterSpacing: 0.6,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            for (final range in _StatsRange.values) ...[
              if (range != _StatsRange.values.first) const SizedBox(width: 8),
              Expanded(
                child: Material(
                  color: _range == range ? AppColors.navy : Colors.transparent,
                  borderRadius: BorderRadius.circular(20),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () {
                      if (_range == range) return;
                      setState(() => _range = range);
                      _load();
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _range == range ? AppColors.navy : AppColors.border,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        range.name[0].toUpperCase() + range.name.substring(1),
                        style: TextStyle(
                          color: _range == range ? AppColors.cream : AppColors.navy,
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 16),
        Align(
          alignment: Alignment.centerRight,
          child: Text(
            'Total: $total pts',
            style: const TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          height: 120,
          child: _loading && series == null
              ? const Center(
                  child: SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.orange),
                  ),
                )
              : _error != null && series == null
                  ? Center(
                      child: Text(
                        _error!,
                        style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    )
                  : Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        for (var i = 0; i < values.length; i++) ...[
                          if (i > 0) SizedBox(width: values.length > 7 ? 3 : 8),
                          Expanded(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Expanded(
                                  child: Align(
                                    alignment: Alignment.bottomCenter,
                                    child: FractionallySizedBox(
                                      heightFactor: values[i] <= 0 || max <= 0
                                          ? 0
                                          : (values[i] / max).clamp(0.08, 1).toDouble(),
                                      widthFactor: 1,
                                      child: DecoratedBox(
                                        decoration: BoxDecoration(
                                          color: AppColors.orange,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  labels[i],
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    color: AppColors.textMuted,
                                    fontWeight: FontWeight.w700,
                                    fontSize: values.length > 7 ? 8 : 10,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
        ),
      ],
    );
  }
}

class _FeatureTile extends StatelessWidget {
  const _FeatureTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.onTap,
    this.badge,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final VoidCallback onTap;
  final String? badge;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: AppRadii.cardRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.cardRadius,
        child: Container(
          height: 148,
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
          decoration: BoxDecoration(
            borderRadius: AppRadii.cardRadius,
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: 0.05),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.cream,
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Text(
                        badge!,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 11,
                          color: AppColors.navy,
                        ),
                      ),
                    )
                  else
                    Icon(icon, color: AppColors.navy, size: 20),
                  const Spacer(),
                  Container(
                    width: 30,
                    height: 30,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.cream,
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Icon(icon, size: 15, color: AppColors.navy),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w900,
                  fontSize: 15,
                  color: AppColors.navy,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 11,
                  color: AppColors.textMuted,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ChildSwitchTile extends StatelessWidget {
  const _ChildSwitchTile({
    required this.child,
    required this.busy,
    required this.onSwitch,
  });

  final FamilyChildProfile child;
  final bool busy;
  final VoidCallback onSwitch;

  @override
  Widget build(BuildContext context) {
    final signInLabel = child.usesEmailPasswordSwitch ? 'Sign in' : 'PIN';
    return AdventureListCard(
      title: child.name,
      subtitle: child.explorerBandLabel,
      icon: Icons.person_rounded,
      accent: AdventureListAccent.green,
      onTap: busy ? null : onSwitch,
      trailing: FilledButton(
        onPressed: busy ? null : onSwitch,
        style: FilledButton.styleFrom(
          backgroundColor: AppColors.orange,
          visualDensity: VisualDensity.compact,
          padding: const EdgeInsets.symmetric(horizontal: 14),
        ),
        child: Text(signInLabel),
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.actionLabel,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    final accent = title.toLowerCase().contains('delete')
        ? AdventureListAccent.danger
        : AdventureListAccent.navy;
    return AdventureListCard(
      title: title,
      icon: icon,
      accent: accent,
      onTap: onTap,
      trailing: actionLabel == null
          ? null
          : Text(
              actionLabel!,
              style: TextStyle(
                color: accent == AdventureListAccent.danger
                    ? const Color(0xFFBA1A1A)
                    : AppColors.teal,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
    );
  }
}
