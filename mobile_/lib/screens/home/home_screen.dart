import '../family/family_screen.dart';
import '../shared/offline_videos_screen.dart';
import '../../config/store_config.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/game_controller.dart';
import '../../theme.dart';
import '../../family/family_account_rules.dart';
import '../../models/auth_session.dart';
import '../shared/widgets/adventure_header.dart';
import '../shared/widgets/adventure_bottom_nav.dart';
import '../shared/widgets/adventure_logo.dart';
import '../shared/widgets/double_back_exit.dart';
import '../account/account_screen.dart';
import '../account/legal_screen.dart';
import '../shared/report_issue_screen.dart';
import '../teen/achievements_screen.dart';
import '../teen/explorer_home_tab.dart';
import '../groups/groups_screen.dart';
import '../groups/join_invite_screen.dart';
import '../teacher/teacher_home_tab.dart';
import '../teen/quest_journey_screen.dart';
import '../teen/bible_catalog_screen.dart';
import '../teen/what_to_learn_screen.dart';
import 'notifications_screen.dart';
import '../../models/api_models.dart';
import '../../services/engagement_service.dart';
import '../../services/family_service.dart';
import '../../services/push_hooks.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  AdventureTab _tab = AdventureTab.home;

  /// Bumped after a successful join so the embedded Groups tab remounts fresh.
  int _groupsEpoch = 0;
  List<Nudge> _nudges = const [];
  List<Map<String, dynamic>> _deletionNotices = const [];
  StreamSubscription<PushNotice>? _pushReceived;
  StreamSubscription<PushNotice>? _pushOpened;
  bool _bellOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _pushReceived = PushHooks.received.listen(_onPushReceived);
    _pushOpened = PushHooks.opened.listen(_onPushOpened);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAskScore(reset: true);
      _loadInbox();
      final pending = PushHooks.takePendingOpen();
      if (pending != null) _onPushOpened(pending);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pushReceived?.cancel();
    _pushOpened?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      _loadInbox();
    }
  }

  void _onPushReceived(PushNotice notice) {
    if (!mounted) return;
    _loadInbox();
    if (notice.type == 'nudge') _loadAskScore();
    final text = [notice.title, notice.body]
        .whereType<String>()
        .where((t) => t.trim().isNotEmpty)
        .join(' — ');
    if (text.isEmpty || _bellOpen) return;
    final actionLabel = (notice.actionLabel?.trim().isNotEmpty ?? false)
        ? notice.actionLabel!.trim()
        : (notice.hasActionUrl ? 'Open' : 'View');
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(
      SnackBar(
        content: Text(text, maxLines: 3, overflow: TextOverflow.ellipsis),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(
          label: actionLabel,
          onPressed: () {
            if (notice.hasActionUrl) {
              unawaited(_openPushAction(notice));
            } else {
              _openBell();
            }
          },
        ),
      ),
    );
  }

  Future<void> _onPushOpened(PushNotice notice) async {
    if (!mounted) return;
    if (notice.hasActionUrl) {
      await _openPushAction(notice);
      return;
    }
    if (_bellOpen) return;
    await _loadInbox();
    if (mounted) await _openBell();
  }

  Future<void> _openPushAction(PushNotice notice) async {
    final raw = notice.actionUrl?.trim();
    if (raw == null || raw.isEmpty) return;
    final uri = Uri.tryParse(raw);
    if (uri == null) return;
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && mounted) {
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        const SnackBar(content: Text('Could not open that link.')),
      );
    }
  }

  Future<void> _loadInbox() async {
    try {
      final session = context.read<AuthSession>();
      final engagement = context.read<EngagementService>();
      List<Nudge> nudges = const [];
      // Child JWT / explorer session — always poll the inbox (do not wait for push).
      // Parents on Family home have no explorer inbox.
      if (session.isChild || session.childId != null) {
        try {
          nudges = await engagement.getNudges();
        } catch (_) {}
      }
      var deletions = const <Map<String, dynamic>>[];
      if (!mounted) return;
      try {
        final memberships =
            await context.read<FamilyService>().getMemberships();
        final items = memberships['items'];
        if (items is List) {
          deletions = [
            for (final item in items)
              if (item is Map && item['deletionPending'] == true)
                Map<String, dynamic>.from(item),
          ];
          if (!mounted) return;
          try {
            final family = await context.read<FamilyService>().getMyFamily();
            final deletionAt = family['deletionAt'];
            if (deletionAt != null) {
              for (final item in deletions) {
                if (item['kind'] == 'FAMILY' && item['deletionAt'] == null) {
                  item['deletionAt'] = deletionAt;
                }
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _nudges = nudges;
        _deletionNotices = deletions;
      });
    } catch (_) {}
  }

  int get _unreadInboxCount => _nudges.where((n) => n.readAt == null).length;

  Future<void> _openBell() async {
    if (_bellOpen) return;
    final session = context.read<AuthSession>();
    final engagement = context.read<EngagementService>();
    // Pull latest cheers before showing the list — push may be offline/unconfigured.
    await _loadInbox();
    if (!mounted) return;
    final hadUnreadNudges = _nudges.any((n) => n.readAt == null);

    // Clear the badge as soon as the inbox is opened.
    if (hadUnreadNudges) {
      setState(() {
        _nudges = [for (final n in _nudges) n.markedRead()];
      });
      if (session.isChild || session.childId != null) {
        unawaited(engagement.markNudgesRead().catchError((_) => null));
      }
    }

    _bellOpen = true;
    final result = await Navigator.push<NotificationsResult>(
      context,
      MaterialPageRoute(
        builder: (_) => NotificationsScreen(
          nudges: _nudges,
          deletionNotices: _deletionNotices,
        ),
      ),
    );
    _bellOpen = false;
    if (!mounted) return;
    if (result != null) {
      setState(() {
        _nudges = result.nudges;
      });
    } else {
      await _loadInbox();
    }
  }

  Future<void> _loadAskScore({bool reset = false}) async {
    try {
      final session = context.read<AuthSession>();
      final userId = session.userId;
      final childId = session.childId;
      final game = context.read<GameController>();
      if (reset) game.setAskScore(0, 0);
      if (childId != null) {
        final score = await context.read<EngagementService>().getAskScore(childId);
        if (mounted && session.childId == childId) {
          game.setAskScore(score.askScore, score.streak);
        }
      } else if (userId != null) {
        final profile = await context.read<FamilyService>().getSession();
        if (!mounted || session.userId != userId || session.childId != null) return;
        final progress = profile['progress'] as Map?;
        final streak = progress?['streak'] as Map?;
        game.setAskScore(
          (progress?['points'] as num?)?.toInt() ?? 0,
          (streak?['current'] as num?)?.toInt() ?? 0,
        );
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final currentRole = session.userRole;

    return DoubleBackExit(
      onUnhandledBack: () async {
        final scaffold = _scaffoldKey.currentState;
        if (scaffold?.isDrawerOpen == true) {
          scaffold!.closeDrawer();
          return true;
        }
        if (_tab != AdventureTab.home) {
          setState(() => _tab = AdventureTab.home);
          return true;
        }
        return false;
      },
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: AppColors.cream,
        drawer: _buildRoleDrawer(session),
        body: Column(
          children: [
            AdventureHeader(
              onMenu: () => _scaffoldKey.currentState?.openDrawer(),
              onBell: _openBell,
              bellBadge: _unreadInboxCount,
              actions: [
                if (_tab == AdventureTab.groups &&
                    !session.isTeacher &&
                    canIndependentlyAcceptInvite(
                      isUnderAgeExplorer: session.isUnderAgeExplorer,
                    ))
                  TextButton(
                    key: const Key('teen-join-group'),
                    onPressed: _openJoinGroup,
                    style: TextButton.styleFrom(
                      foregroundColor: AppColors.cream,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    child: const Text(
                      'Join Group',
                      style:
                          TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
                    ),
                  ),
              ],
            ),
            Expanded(child: _buildTabBody(context, currentRole)),
          ],
        ),
        bottomNavigationBar: AdventureBottomNav(
          current: _tab,
          onSelect: (tab) => setState(() => _tab = tab),
          groupsLabel: session.isTeacher ? 'Classes' : 'Groups',
        ),
      ),
    );
  }

  Widget _buildTabBody(BuildContext context, UserRole currentRole) {
    final session = context.watch<AuthSession>();
    switch (_tab) {
      case AdventureTab.home:
        return const ExplorerHomeTab();
      case AdventureTab.bible:
        if (currentRole == UserRole.student && session.isUnderAgeExplorer) {
          return const WhatToLearnScreen(embedded: true);
        }
        return const BibleCatalogScreen(embedded: true);
      case AdventureTab.quests:
        return QuestJourneyScreen(
          embedded: true,
          onQuestOfDayChanged: (_) {
            setState(() => _tab = AdventureTab.home);
          },
        );
      case AdventureTab.rewards:
        return const AchievementsScreen(embedded: true);
      case AdventureTab.groups:
        if (session.isTeacher) {
          return TeacherHomeTab(
            key: ValueKey('classes-$_groupsEpoch'),
            embedded: true,
          );
        }
        return GroupsScreen(
          key: ValueKey('groups-$_groupsEpoch'),
          embedded: true,
          showRanks: true,
        );
      case AdventureTab.account:
        return const AccountScreen();
    }
  }

  void _goTab(AdventureTab tab) {
    Navigator.pop(context);
    setState(() => _tab = tab);
  }

  Future<void> _openJoinGroup() async {
    final session = context.read<AuthSession>();
    if (!canIndependentlyAcceptInvite(
        isUnderAgeExplorer: session.isUnderAgeExplorer)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content:
              Text('Your parent accepts group invites from their account.'),
          backgroundColor: AppColors.navy,
        ),
      );
      return;
    }
    final joined = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const JoinInviteScreen()),
    );
    if (!mounted || joined != true) return;
    await context.read<AuthSession>().refreshProfile();
    if (!mounted) return;
    setState(() {
      _groupsEpoch++;
      _tab = AdventureTab.groups;
    });
  }

  Widget _buildRoleDrawer(AuthSession session) {
    final unread = _unreadInboxCount;
    return Drawer(
      backgroundColor: AppColors.cream,
      child: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                children: [
                  const AdventureLogo(height: 68),
                  const SizedBox(height: 16),
                  Text(
                    session.displayName?.trim().isNotEmpty == true
                        ? session.displayName!
                        : session.accountKindLabel,
                    style: const TextStyle(
                        fontWeight: FontWeight.w900, color: AppColors.navy),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    session.accountKindLabel,
                    style: const TextStyle(
                        fontSize: 12, color: AppColors.textMuted),
                  ),
                  const Divider(height: 28),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading:
                        const Icon(Icons.home_rounded, color: AppColors.navy),
                    title: const Text('Home'),
                    onTap: () => _goTab(AdventureTab.home),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.explore_rounded,
                        color: AppColors.orange),
                    title: const Text('Quest'),
                    onTap: () => _goTab(AdventureTab.quests),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.emoji_events_rounded,
                        color: AppColors.gold),
                    title: const Text('Achievements'),
                    onTap: () => _goTab(AdventureTab.rewards),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.groups_rounded,
                        color: AppColors.orange),
                    title: Text(session.isTeacher ? 'Classes' : 'Groups'),
                    onTap: () => _goTab(AdventureTab.groups),
                  ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Badge(
                      isLabelVisible: unread > 0,
                      label: Text('$unread'),
                      child: const Icon(Icons.favorite_outline,
                          color: AppColors.orange),
                    ),
                    title: const Text('Notifications'),
                    onTap: () {
                      Navigator.pop(context);
                      _openBell();
                    },
                  ),
                  if (session.isParent)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.family_restroom_rounded,
                          color: AppColors.teal),
                      title: const Text('Family'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const FamilyScreen()),
                        );
                      },
                    ),
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(Icons.person_outline_rounded,
                        color: AppColors.navy),
                    title: const Text('Account'),
                    onTap: () => _goTab(AdventureTab.account),
                  ),
                  if ((session.isParent && session.children.isNotEmpty) ||
                      session.canRestoreParent)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.switch_account_rounded,
                          color: AppColors.teal),
                      title: const Text('Switch account'),
                      subtitle: Text(
                        session.canRestoreParent
                            ? 'Back to parent / change profile'
                            : 'Change who is watching',
                        style: const TextStyle(fontSize: 12),
                      ),
                      onTap: () async {
                        Navigator.pop(context);
                        try {
                          await context
                              .read<AuthSession>()
                              .switchWatchingProfile();
                        } catch (_) {
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Could not switch account.'),
                              backgroundColor: AppColors.navy,
                            ),
                          );
                        }
                      },
                    ),
                  if (StoreConfig.showOfflineDownload)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(Icons.download_for_offline,
                          color: AppColors.navy),
                      title: const Text('Offline Videos'),
                      onTap: () {
                        Navigator.pop(context);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                              builder: (_) => const OfflineVideosScreen()),
                        );
                      },
                    ),
                ],
              ),
            ),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
              child: Column(
                children: [
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    leading: const Icon(Icons.logout, color: AppColors.navy),
                    title: const Text('Sign out'),
                    onTap: () {
                      Navigator.pop(context);
                      context.read<AuthSession>().logout();
                    },
                  ),
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    leading:
                        const Icon(Icons.flag_outlined, color: AppColors.navy),
                    title: const Text('Report an issue'),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const ReportIssueScreen()),
                      );
                    },
                  ),
                  ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 8),
                    leading: const Icon(Icons.description_outlined,
                        color: AppColors.textMuted),
                    title: const Text(
                      'Terms & Conditions',
                      style: TextStyle(
                          color: AppColors.textSecondary, fontSize: 14),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) =>
                                const LegalScreen(doc: LegalDoc.terms)),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
