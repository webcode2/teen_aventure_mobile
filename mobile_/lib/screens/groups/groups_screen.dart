import '../family/family_screen.dart';
import '../account/individual_account_deletion_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../family/family_account_rules.dart';
import '../../join_payload.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../services/api_client.dart';
import '../../services/engagement_service.dart';
import '../../providers/cms_text.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import 'invite_share_screen.dart';
import 'join_invite_screen.dart';
import '../shared/report_issue_screen.dart';
import '../shared/widgets/adventure_list_card.dart';
import '../shared/widgets/circle_stats_card.dart';
import 'group_standing_board.dart';
import 'teacher_class_members.dart';
import '../../services/error_text.dart';

bool _isGroupAdmin(Map<String, dynamic>? item) {
  if (item == null) return false;
  if (item['canAdmin'] == true) return true;
  final role = (item['role'] as String? ?? '').toLowerCase();
  return role == 'owner' || role == 'admin' || role == 'teacher';
}

bool _isTeachingGroup(Map<String, dynamic>? item) {
  if (item == null) return false;
  final role = (item['role'] as String? ?? '').toLowerCase();
  return item['canAdmin'] == true && (role == 'teacher' || role == 'owner');
}

class GroupsScreen extends StatefulWidget {
  const GroupsScreen({
    super.key,
    this.membershipsOverride,
    this.embedded = false,
    this.showRanks = false,
    this.ranksOverride,
  });

  final Map<String, dynamic>? membershipsOverride;
  final bool embedded;
  final bool showRanks;
  final List<LeaderboardEntry>? ranksOverride;

  @override
  State<GroupsScreen> createState() => _GroupsScreenState();
}

class _GroupsScreenState extends State<GroupsScreen> {
  Map<String, dynamic>? _data;
  GroupJar? _jar;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    final override = widget.membershipsOverride;
    if (override != null) {
      _data = override;
      _loading = false;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }
  }

  Future<void> _load() async {
    final override = widget.membershipsOverride;
    if (override != null) {
      setState(() {
        _data = override;
        _loading = false;
        _error = null;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await context.read<FamilyService>().getMemberships();
      try {
        final family = await context.read<FamilyService>().getMyFamily();
        final deletionAt = family['deletionAt'];
        final items = data['items'];
        if (deletionAt != null && items is List) {
          for (final item in items) {
            if (item is Map && item['kind'] == 'FAMILY' && item['deletionAt'] == null) {
              item['deletionAt'] = deletionAt;
            }
          }
        }
      } catch (_) {}
      GroupJar? jar;
      try {
        jar = await context.read<EngagementService>().getGroupJar();
      } catch (_) {
        jar = null;
      }
      if (mounted) {
        setState(() {
          _data = data;
          _jar = jar;
        });
      }
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _items {
    final list = _data?['items'];
    if (list is List) {
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return const [];
  }

  int _countKind(String kind) => _items.where((item) => item['kind'] == kind).length;

  List<AssignedClass> _standingClasses(AuthSession session) {
    final classes = session.allAssignedClasses;
    // Memberships include groups joined by linked explorers, even after independent invites.
    if (_items.isEmpty && classes.isNotEmpty) return classes;
    return [
      for (final item in _items)
        if ((item['kind'] == 'CLASS' || item['kind'] == 'FAMILY') && item['id'] is String)
          AssignedClass(
            id: item['id'] as String,
            name: item['name'] as String? ?? 'Group',
            kind: item['kind'] as String? ?? 'CLASS',
          ),
    ];
  }

  Future<void> _join() async {
    final session = context.read<AuthSession>();
    if (!canIndependentlyAcceptInvite(isUnderAgeExplorer: session.isUnderAgeExplorer)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Your parent accepts group invites from their account.'),
          backgroundColor: AppColors.navy,
        ),
      );
      return;
    }
    final joined = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => const JoinInviteScreen()),
    );
    if (joined == true) _load();
  }

  Future<void> _openInvite(Map<String, dynamic> item) async {
    final kind = item['kind'] as String? ?? 'FAMILY';
    final id = item['id'] as String?;
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => InviteShareScreen(
          kind: kind,
          familyId: kind == 'FAMILY' ? id : null,
          churchId: kind == 'CHURCH' ? id : null,
          classId: kind == 'CLASS' ? id : null,
          joinCode: item['joinCode'] as String?,
          groupName: item['name'] as String?,
        ),
      ),
    );
  }

  Future<void> _deleteGroup(Map<String, dynamic> item) async {
    if (item['kind'] == 'FAMILY') {
      await Navigator.push(context, MaterialPageRoute(builder: (_) => const IndividualAccountDeletionScreen()));
      if (mounted) await _load();
      return;
    }
    final name = item['name'] as String? ?? 'this group';
    final members = (item['memberCount'] as num?)?.toInt() ?? 1;
    final flagged = members > 1;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(flagged ? 'Schedule group deletion?' : 'Delete group?'),
        content: Text(
          flagged
              ? 'Members will see a 3-day deletion date. They can leave before then. $name will be removed after that notice.'
              : '$name will be deleted now.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(flagged ? 'Schedule deletion' : 'Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      final result = await context.read<FamilyService>().deleteGroup(
            kind: item['kind'] as String,
            id: item['id'] as String,
          );
      await context.read<AuthSession>().refreshProfile();
      await _load();
      if (!mounted) return;
      if (Navigator.canPop(context)) Navigator.pop(context);
      final pending = result['pending'] == true && result['immediate'] != true;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            pending
                ? 'Members can now see that $name is scheduled for deletion.'
                : '$name was deleted.',
          ),
          backgroundColor: AppColors.navy,
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e)), backgroundColor: AppColors.navy));
      }
    }
  }

  Future<void> _cancelPendingDeletion(Map<String, dynamic> item) async {
    if (item['kind'] != 'FAMILY') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This group type cannot be restored from the app. Members can still leave.'),
          backgroundColor: AppColors.navy,
        ),
      );
      return;
    }
    try {
      await context.read<FamilyService>().cancelDeletion();
      await context.read<AuthSession>().refreshProfile();
      await _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Family deletion cancelled.'), backgroundColor: AppColors.navy),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e)), backgroundColor: AppColors.navy));
      }
    }
  }

  Future<bool> _leave(Map<String, dynamic> item) async {
    final name = item['name'] as String? ?? 'this group';
    final isChurch = (item['kind'] as String? ?? '').toUpperCase() == 'CHURCH';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isChurch ? 'Leave church?' : 'Leave group?'),
        content: Text(
          isChurch
              ? 'You are about to leave $name. You will also be removed from all of its church groups. You can join again later with a new invite.'
              : 'You are about to leave $name. Your standing and points in this group will no longer be available here. You can join again later with a new invite.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Leave')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return false;
    try {
      await context.read<FamilyService>().leaveMembership(
            kind: item['kind'] as String,
            id: item['id'] as String,
          );
      await context.read<AuthSession>().refreshProfile();
      await _load();
      return true;
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e)), backgroundColor: AppColors.navy));
      }
      return false;
    }
  }

  Map<String, dynamic>? _membershipFor(String id) {
    for (final item in _items) {
      if (item['id'] == id) return item;
    }
    return null;
  }

  Future<void> _openGroupStanding(AssignedClass cls) async {
    final item = _membershipFor(cls.id);
    final isFamily = (item?['kind'] as String? ?? cls.kind).toUpperCase() == 'FAMILY';
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) => _GroupStandingScreen(
          cls: cls,
          membership: item,
          canLeave: !isFamily && item?['canLeave'] == true,
          canInvite: !isFamily && _isGroupAdmin(item),
          canDelete: _isGroupAdmin(item),
          canNudge: !isFamily && _isGroupAdmin(item),
          ranksOverride: widget.ranksOverride,
          onLeave: isFamily || item == null ? null : () => _leave(item),
          onInvite: isFamily || item == null || !_isGroupAdmin(item) ? null : () => _openInvite(item),
          onDelete: item == null || !_isGroupAdmin(item) ? null : () => _deleteGroup(item),
          onCancelDeletion: item != null &&
                  item['deletionPending'] == true &&
                  item['kind'] == 'FAMILY' &&
                  _isGroupAdmin(item)
              ? () => _cancelPendingDeletion(item)
              : null,
        ),
      ),
    );
  }

  void _openMembershipStanding(Map<String, dynamic> item) {
    _openGroupStanding(
      AssignedClass(
        id: item['id'] as String,
        name: item['name'] as String? ?? 'Group',
        kind: item['kind'] as String? ?? 'CLASS',
      ),
    );
  }

  List<Widget> _groupListingTiles() {
    // Prefer membership items; nest church subgroups under their ministry.
    if (_items.isNotEmpty) {
      final families = _items.where((i) => (i['kind'] as String?) == 'FAMILY').toList();
      final churches = _items.where((i) => (i['kind'] as String?) == 'CHURCH').toList();
      final classes = _items.where((i) => (i['kind'] as String?) == 'CLASS').toList();
      final nestedIds = <String>{};
      final tiles = <Widget>[];

      void addTile(Map<String, dynamic> item, {bool nested = false}) {
        final tile = _MembershipTile(
          item: item,
          nested: nested,
          onTap: () => _openMembershipStanding(item),
        );
        tiles.add(nested ? Padding(padding: const EdgeInsets.only(left: 18), child: tile) : tile);
        tiles.add(const SizedBox(height: 10));
      }

      for (final item in families) {
        addTile(item);
      }
      for (final church in churches) {
        addTile(church);
        final churchId = church['id'] as String?;
        final subgroups = classes.where((c) {
          final linked = c['churchId'] as String?;
          return churchId != null && linked == churchId;
        }).toList();
        if (subgroups.isNotEmpty) {
          tiles.add(
            const Padding(
              padding: EdgeInsets.only(left: 18, bottom: 6),
              child: Text(
                'Groups',
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ),
          );
          for (final sub in subgroups) {
            nestedIds.add(sub['id'] as String);
            addTile(sub, nested: true);
          }
        }
      }
      for (final item in classes) {
        final id = item['id'] as String?;
        if (id != null && nestedIds.contains(id)) continue;
        addTile(item);
      }
      return tiles;
    }

    final boards = _standingClasses(context.read<AuthSession>());
    return [
      for (final cls in boards) ...[
        _GroupListingTile(
          key: Key('group-listing-${cls.id}'),
          name: cls.name,
          kind: cls.kind,
          deletionPending: _membershipFor(cls.id)?['deletionPending'] == true,
          onTap: () => _openGroupStanding(cls),
        ),
        const SizedBox(height: 10),
      ],
    ];
  }

  Future<void> _createGroup() async {
    final session = context.read<AuthSession>();
    if (!session.canCreateGroups) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Only adults can create groups. You can join a group with an invite.'),
          backgroundColor: AppColors.navy,
        ),
      );
      return;
    }
    final result = await showDialog<_NewGroupFormResult>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const _NewGroupDialog(),
    );
    if (result == null || result.name.isEmpty || !mounted) return;
    try {
      final created = await context.read<FamilyService>().createGroup(
            result.name,
            description: result.description,
          );
      await _load();
      if (!mounted) return;
      final id = created['id'] as String?;
      if (id == null) return;
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => InviteShareScreen(
            kind: 'CLASS',
            classId: id,
            joinCode: created['joinCode'] as String?,
            groupName: created['name'] as String? ?? result.name,
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorText(e)), backgroundColor: AppColors.navy),
        );
      }
    }
  }

  Widget _yourGroupsHeader(AuthSession session) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Your groups',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
        ),
        const SizedBox(height: 4),
        const Text(
          'Open a group to see details and standing.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        Wrap(
          spacing: 8,
          children: [
            if (session.isParent && session.familyId != null)
              TextButton.icon(
                onPressed: () async {
                  await Navigator.push<void>(
                    context,
                    MaterialPageRoute(builder: (_) => const FamilyScreen()),
                  );
                  if (mounted) await _load();
                },
                icon: const Icon(Icons.family_restroom_rounded, size: 18),
                label: const Text('Family'),
              ),
            if (session.canCreateGroups)
              TextButton.icon(
                key: const Key('create-group'),
                onPressed: _createGroup,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('New group'),
              ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final underAge = session.isUnderAgeExplorer;
    final families = _countKind('FAMILY');
    final circles = _countKind('CLASS') + _countKind('CHURCH');
    final listings = _items.isEmpty && _standingClasses(session).isEmpty
        ? const <Widget>[]
        : _groupListingTiles();

    final body = _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: () => Future.wait([_load(), refreshDashboardCopy(context)]),
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (_error != null) ...[
                  Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
                  const SizedBox(height: 12),
                ],
                CircleStatsCard(
                  title: 'Group ',
                  subtitle: 'Families, groups, and points at a glance',
                  empty: families == 0 && circles == 0 && _jar == null,
                  stats: [
                    CircleStat(
                      icon: Icons.home_rounded,
                      iconColor: AppColors.orange,
                      value: '$families',
                      label: families == 1 ? 'Family' : 'Families',
                    ),
                    CircleStat(
                      icon: Icons.groups_rounded,
                      iconColor: AppColors.teal,
                      value: '$circles',
                      label: circles == 1 ? 'Group' : 'Groups',
                    ),
                    CircleStat(
                      icon: Icons.stars_rounded,
                      iconColor: AppColors.gold,
                      value: '${_jar?.groupJarTotal ?? 0}',
                      label: 'Points',
                      emphasize: true,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _yourGroupsHeader(session),
                const SizedBox(height: 12),
                if (listings.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: AppRadii.cardRadius,
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      underAge
                          ? 'Your parent accepts group invites for you from their account.'
                          : 'You have not joined a family, group, or church yet.',
                      style: const TextStyle(color: AppColors.textSecondary),
                    ),
                  )
                else
                  ...listings,
              ],
            ),
          );

    if (widget.embedded) {
      return ColoredBox(color: AppColors.cream, child: body);
    }
    final canJoinHeader = canIndependentlyAcceptInvite(
      isUnderAgeExplorer: session.isUnderAgeExplorer,
    );
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text('Groups', style: TextStyle(fontWeight: FontWeight.w900)),
        actions: [
          if (canJoinHeader)
            TextButton(
              key: const Key('teen-join-group'),
              onPressed: _join,
              style: TextButton.styleFrom(foregroundColor: AppColors.cream),
              child: const Text('Join Group', style: TextStyle(fontWeight: FontWeight.w900)),
            ),
        ],
      ),
      body: body,
    );
  }
}

class _GroupListingTile extends StatelessWidget {
  const _GroupListingTile({
    super.key,
    required this.name,
    required this.kind,
    required this.onTap,
    this.deletionPending = false,
  });

  final String name;
  final String kind;
  final VoidCallback onTap;
  final bool deletionPending;

  IconData get _kindIcon {
    switch (kind.toUpperCase()) {
      case 'FAMILY':
        return Icons.home_rounded;
      case 'CHURCH':
        return Icons.account_balance_rounded;
      default:
        return Icons.groups_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AdventureListCard(
      title: name,
      subtitle: deletionPending
          ? '${joinKindLabel(kind)} · Scheduled for deletion'
          : '${joinKindLabel(kind)} · Standing',
      icon: _kindIcon,
      onTap: onTap,
      accent: deletionPending
          ? AdventureListAccent.danger
          : AdventureListCard.accentForKind(kind),
    );
  }
}

class _GroupStandingScreen extends StatefulWidget {
  const _GroupStandingScreen({
    required this.cls,
    required this.canLeave,
    this.membership,
    this.ranksOverride,
    this.onLeave,
    this.canInvite = false,
    this.canDelete = false,
    this.canNudge = false,
    this.onInvite,
    this.onDelete,
    this.onCancelDeletion,
  });

  final AssignedClass cls;
  final bool canLeave;
  final Map<String, dynamic>? membership;
  final List<LeaderboardEntry>? ranksOverride;
  final Future<bool> Function()? onLeave;
  final bool canInvite;
  final bool canDelete;
  final bool canNudge;
  final VoidCallback? onInvite;
  final VoidCallback? onDelete;
  final VoidCallback? onCancelDeletion;

  @override
  State<_GroupStandingScreen> createState() => _GroupStandingScreenState();
}

class _GroupStandingScreenState extends State<_GroupStandingScreen> {
  GroupDetail? _detail;
  bool _loading = true;
  String? _error;

  String get _kind => membershipApiKind(
        widget.membership?['kind'] as String? ?? widget.cls.kind,
      );

  @override
  void initState() {
    super.initState();
    if (widget.membership?['underReview'] == true || widget.ranksOverride != null) {
      _loading = false;
    } else {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
    }
  }

  Future<void> _load() async {
    if (widget.ranksOverride != null) return;
    setState(() {
      _loading = _detail == null;
      _error = null;
    });
    try {
      final detail = await context.read<FamilyService>().getGroupDetail(kind: _kind, id: widget.cls.id);
      if (mounted) setState(() => _detail = detail);
    } on ApiException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not load this group.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _confirmLeave(BuildContext context) async {
    if (widget.onLeave == null) return;
    final left = await widget.onLeave!();
    if (left && context.mounted) Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final membership = _detail?.mergeInto(widget.membership) ?? widget.membership;
    final underReview = membership?['underReview'] == true;
    final canInvite = widget.canInvite && !underReview;
    final onInvite = widget.onInvite;
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => Future.wait([_load(), refreshDashboardCopy(context)]),
              child: CustomScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                slivers: [
                  SliverToBoxAdapter(
                    child: _GroupHeroHeader(
                      cls: widget.cls,
                      membership: membership,
                      canLeave: widget.canLeave,
                      canDelete: widget.canDelete,
                      onLeave: widget.onLeave == null ? null : () => _confirmLeave(context),
                      onInvite: canInvite ? onInvite : null,
                      onDelete: widget.onDelete,
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _GroupDetailBody(
                          cls: widget.cls,
                          membership: membership,
                          ranksOverride: widget.ranksOverride ?? _detail?.standings,
                          standingsLoading: _loading,
                          standingsError: _detail == null ? _error : null,
                          onRetry: _load,
                          onCancelDeletion: widget.onCancelDeletion,
                          hideTitleBlock: true,
                          canNudge: widget.canNudge,
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (canInvite && onInvite != null)
            ColoredBox(
              color: AppColors.cream,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: _GroupDetailActions(onInvite: onInvite),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _GroupHeroHeader extends StatelessWidget {
  const _GroupHeroHeader({
    required this.cls,
    this.membership,
    this.canLeave = false,
    this.canDelete = false,
    this.onLeave,
    this.onInvite,
    this.onDelete,
  });

  final AssignedClass cls;
  final Map<String, dynamic>? membership;
  final bool canLeave;
  final bool canDelete;
  final VoidCallback? onLeave;
  final VoidCallback? onInvite;
  final VoidCallback? onDelete;

  IconData get _kindIcon {
    switch (cls.kind.toUpperCase()) {
      case 'FAMILY':
        return Icons.home_rounded;
      case 'CHURCH':
        return Icons.account_balance_rounded;
      default:
        return Icons.groups_rounded;
    }
  }

  String get _statusLabel {
    if (membership?['deletionPending'] == true) return 'Deletion pending';
    final role = membership?['role'] as String?;
    if (role != null && role.trim().isNotEmpty) return role.trim();
    return joinKindLabel(cls.kind);
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          height: top + 132,
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppColors.navy,
                Color(0xFF0A3A5C),
                Color(0xFF0E5A6A),
              ],
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(8, top + 4, 16, 0),
          child: Row(
            children: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back_rounded, color: AppColors.cream),
              ),
              const Spacer(),
              if (canLeave && onLeave != null)
                TextButton(
                  key: Key('leave-group-${cls.id}'),
                  onPressed: onLeave,
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.cream,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: const Text('Leave', style: TextStyle(fontWeight: FontWeight.w700)),
                )
              else
                const Text(
                  'Group details',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                    color: AppColors.cream,
                  ),
                ),
              PopupMenuButton<String>(
                key: Key('group-options-${cls.id}'),
                icon: const Icon(Icons.more_vert, color: AppColors.cream),
                color: AppColors.surface,
                onSelected: (value) {
                  if (value == 'delete') {
                    onDelete?.call();
                  } else if (value == 'report') {
                    final kind = (membership?['kind'] as String? ?? cls.kind).toUpperCase();
                    final groupKind = (membership?['groupKind'] as String? ?? '').toUpperCase();
                    final linkedChurch = membership?['churchId'] as String?;
                    final canReportToChurch = kind == 'CHURCH' ||
                        groupKind == 'CHURCH' ||
                        (linkedChurch != null && linkedChurch.isNotEmpty);
                    Navigator.push<void>(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReportIssueScreen(
                          targetType: kind == 'CHURCH' ? 'church' : 'group',
                          targetId: cls.id,
                          targetName: cls.name,
                          canReportToChurch: canReportToChurch,
                        ),
                      ),
                    );
                  }
                },
                itemBuilder: (context) => [
                  if (canDelete && onDelete != null)
                    const PopupMenuItem(
                      value: 'delete',
                      child: Text('Delete group'),
                    ),
                  PopupMenuItem(
                    key: Key('report-group-${cls.id}'),
                    value: 'report',
                    child: const Text('Report'),
                  ),
                ],
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(20, top + 56, 20, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(
                      color: AppColors.orange,
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.cream, width: 3),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.navy.withValues(alpha: 0.28),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(_kindIcon, size: 40, color: AppColors.cream),
                  ),
                  if (onInvite != null)
                    Positioned(
                      right: -2,
                      bottom: -2,
                      child: Material(
                        color: AppColors.teal,
                        shape: const CircleBorder(),
                        child: InkWell(
                          customBorder: const CircleBorder(),
                          onTap: onInvite,
                          child: const Padding(
                            padding: EdgeInsets.all(7),
                            child: Icon(Icons.edit_rounded, size: 14, color: AppColors.cream),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cls.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 24,
                          height: 1.15,
                          color: AppColors.cream,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.sageContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          _statusLabel,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppColors.forestGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _GroupDetailBody extends StatelessWidget {
  const _GroupDetailBody({
    required this.cls,
    this.membership,
    this.ranksOverride,
    this.standingsLoading = false,
    this.standingsError,
    this.onRetry,
    this.onCancelDeletion,
    this.hideTitleBlock = false,
    this.canNudge = false,
  });

  final AssignedClass cls;
  final Map<String, dynamic>? membership;
  final List<LeaderboardEntry>? ranksOverride;
  final bool standingsLoading;
  final String? standingsError;
  final VoidCallback? onRetry;
  final VoidCallback? onCancelDeletion;
  final bool hideTitleBlock;
  final bool canNudge;

  String get _displayKind {
    final groupKind = membership?['groupKind'] as String?;
    if (groupKind != null && groupKind.trim().isNotEmpty) return groupKind.trim();
    return cls.kind;
  }

  String get _description {
    final fromItem = membership?['description'] as String?;
    if (fromItem != null && fromItem.trim().isNotEmpty) return fromItem.trim();
    return 'A ${joinKindLabel(_displayKind).toLowerCase()} circle for explorers in Teen Bible Adventures.';
  }

  String get _creatorName {
    for (final key in ['creatorName', 'adminName']) {
      final value = membership?[key] as String?;
      if (value != null && value.trim().isNotEmpty) return value.trim();
    }
    return 'Group creator';
  }

  String get _creatorEmail {
    final email = membership?['creatorEmail'] as String?;
    if (email != null && email.trim().isNotEmpty) return email.trim();
    return '';
  }

  @override
  Widget build(BuildContext context) {
    if (membership?['underReview'] == true) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Under review',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppColors.navy),
            ),
            SizedBox(height: 8),
            Text(
              'This ministry is under review. Group activities are paused.',
              style: TextStyle(fontSize: 14, color: AppColors.textMuted),
            ),
          ],
        ),
      );
    }
    final role = membership?['role'] as String? ?? 'Member';
    final members = (membership?['memberCount'] as num?)?.toInt();
    final points = (membership?['points'] as num?)?.toInt();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (membership?['deletionPending'] == true) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFFDAD6),
              borderRadius: AppRadii.cardRadius,
            ),
            child: Text(
              () {
                final started = deletionStartedAt(membership!);
                if (started == null) {
                  return 'This group is scheduled for deletion.\n\nAll members will be removed when the deletion period ends.';
                }
                return groupDeletionBannerText(scheduledDeletionDeadline(started));
              }(),
              style: const TextStyle(color: Color(0xFF410E0B), height: 1.35),
            ),
          ),
          if (onCancelDeletion != null) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: onCancelDeletion,
              child: const Text('Cancel family deletion'),
            ),
          ],
          const SizedBox(height: 14),
        ],
        if (!hideTitleBlock) ...[
          Text(
            joinKindLabel(_displayKind),
            style: const TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 12,
              color: AppColors.teal,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            cls.name,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 22,
              color: AppColors.navy,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 12),
        ],
        if (points != null) ...[
          Text(
            '$points pts',
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 32,
              letterSpacing: -0.8,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 12),
        ],
        _GroupMetaIconsRow(
          members: members,
          role: role,
          kindLabel: joinKindLabel(_displayKind),
        ),
        const SizedBox(height: 20),
        const Text(
          'Description',
          style: TextStyle(
            fontWeight: FontWeight.w800,
            fontSize: 15,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: 6),
        _ExpandableDescription(text: _description),
        const SizedBox(height: 18),
        _GroupLeadCard(name: _creatorName, email: _creatorEmail),
        if (canNudge && _isTeachingGroup(membership) && cls.kind.toUpperCase() != 'FAMILY') ...[
          const SizedBox(height: 24),
          const Text(
            'Members',
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 16,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'See everyone in this group. Cheer all members or only the ones you select.',
            style: TextStyle(fontSize: 13, color: AppColors.textMuted),
          ),
          const SizedBox(height: 12),
          TeacherClassMembers(classId: cls.id, className: cls.name),
        ],
        const SizedBox(height: 24),
        const Text(
          'Your standing',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: 16,
            color: AppColors.navy,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Here is how explorers rank in this group.',
          style: TextStyle(fontSize: 13, color: AppColors.textMuted),
        ),
        const SizedBox(height: 12),
        if (standingsLoading && ranksOverride == null)
          const SizedBox(height: 48, child: Center(child: CircularProgressIndicator()))
        else if (standingsError != null && ranksOverride == null)
          Row(
            children: [
              Expanded(
                child: Text(standingsError!, style: const TextStyle(color: Color(0xFFBA1A1A))),
              ),
              if (onRetry != null) TextButton(onPressed: onRetry, child: const Text('Retry')),
            ],
          )
        else
          GroupStandingBoard(
            key: ValueKey(ranksOverride),
            classId: cls.id,
            entriesOverride: ranksOverride ?? const [],
            canNudge: canNudge,
          ),
      ],
    );
  }
}

class _ExpandableDescription extends StatefulWidget {
  const _ExpandableDescription({required this.text});

  final String text;

  @override
  State<_ExpandableDescription> createState() => _ExpandableDescriptionState();
}

class _ExpandableDescriptionState extends State<_ExpandableDescription> {
  static const _style = TextStyle(
    color: AppColors.textSecondary,
    height: 1.45,
    fontSize: 14,
  );

  bool _expanded = false;

  @override
  void didUpdateWidget(covariant _ExpandableDescription oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      _expanded = false;
    }
  }

  bool _exceedsTwoLines(double maxWidth) {
    final painter = TextPainter(
      text: TextSpan(text: widget.text, style: _style),
      maxLines: 2,
      textDirection: TextDirection.ltr,
    )..layout(maxWidth: maxWidth);
    return painter.didExceedMaxLines;
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final overflows = _exceedsTwoLines(constraints.maxWidth);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.text,
              maxLines: _expanded ? null : 2,
              overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
              style: _style,
            ),
            if (overflows) ...[
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () => setState(() => _expanded = !_expanded),
                child: Text(
                  _expanded ? 'Show less' : 'Read more',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                    color: AppColors.teal,
                  ),
                ),
              ),
            ],
          ],
        );
      },
    );
  }
}

class _GroupMetaIconsRow extends StatelessWidget {
  const _GroupMetaIconsRow({
    required this.role,
    required this.kindLabel,
    this.members,
  });

  final int? members;
  final String role;
  final String kindLabel;

  @override
  Widget build(BuildContext context) {
    final items = <({IconData icon, String label})>[
      (icon: Icons.category_outlined, label: kindLabel),
      if (members != null) (icon: Icons.groups_outlined, label: '$members'),
      (icon: Icons.badge_outlined, label: role),
    ];
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: [
        for (final item in items)
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(item.icon, size: 18, color: AppColors.teal),
              const SizedBox(width: 6),
              Text(
                item.label,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
      ],
    );
  }
}

class _GroupLeadCard extends StatelessWidget {
  const _GroupLeadCard({
    required this.name,
    required this.email,
  });

  final String name;
  final String email;

  @override
  Widget build(BuildContext context) {
    final initial = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
    return CustomPaint(
      painter: _DashedRRectPainter(
        color: AppColors.borderDark,
        radius: AppRadii.card,
      ),
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: AppRadii.cardRadius,
        ),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
        child: Column(
          children: [
            
            const SizedBox(height: 10),
            Row(
              children: [
                CircleAvatar(
                  radius: 18,
                  backgroundColor: AppColors.terracottaContainer,
                  child: Text(
                    initial,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      color: AppColors.navy,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: AppColors.navy,
                        ),
                      ),
                      if (email.isNotEmpty)
                        Text(
                          email,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                    ],
                  ),
                ),
                const Icon(Icons.workspace_premium_outlined, size: 18, color: AppColors.gold),
                const SizedBox(width: 4),
                const Text(
                  'Creator',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.teal,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DashedRRectPainter extends CustomPainter {
  _DashedRRectPainter({required this.color, required this.radius});

  final Color color;
  final double radius;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4;
    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      Radius.circular(radius),
    );
    final path = Path()..addRRect(rrect);
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      const dash = 5.0;
      const gap = 4.0;
      while (distance < metric.length) {
        final next = (distance + dash).clamp(0.0, metric.length);
        canvas.drawPath(metric.extractPath(distance, next), paint);
        distance = next + gap;
      }
    }
  }

  @override
  bool shouldRepaint(covariant _DashedRRectPainter oldDelegate) =>
      oldDelegate.color != color || oldDelegate.radius != radius;
}

class _GroupDetailActions extends StatelessWidget {
  const _GroupDetailActions({required this.onInvite});

  final VoidCallback? onInvite;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onInvite,
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.navy,
        side: const BorderSide(color: AppColors.borderDark),
        backgroundColor: AppColors.surface,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: AppRadii.cardRadius),
      ),
      child: const Text('Invite member', style: TextStyle(fontWeight: FontWeight.w800)),
    );
  }
}

class _MembershipTile extends StatelessWidget {
  const _MembershipTile({
    required this.item,
    required this.onTap,
    this.nested = false,
  });

  final Map<String, dynamic> item;
  final VoidCallback onTap;
  final bool nested;

  @override
  Widget build(BuildContext context) {
    final kind = item['kind'] as String? ?? 'CLASS';
    final pending = item['deletionPending'] == true;
    final label = nested ? 'Group' : joinKindLabel(kind);

    IconData kindIcon;
    switch (kind.toUpperCase()) {
      case 'FAMILY':
        kindIcon = Icons.home_rounded;
      case 'CHURCH':
        kindIcon = Icons.account_balance_rounded;
      default:
        kindIcon = Icons.groups_rounded;
    }

    return AdventureListCard(
      title: item['name'] as String? ?? 'Group',
      subtitle: item['underReview'] == true
          ? '$label · Under review'
          : pending
              ? '$label · Scheduled for deletion'
              : '$label · Standing',
      icon: kindIcon,
      onTap: onTap,
      accent: item['underReview'] == true
          ? AdventureListAccent.gold
          : pending
              ? AdventureListAccent.danger
              : nested
                  ? AdventureListAccent.teal
                  : AdventureListCard.accentForKind(kind),
    );
  }
}

class _NewGroupFormResult {
  const _NewGroupFormResult({required this.name, required this.description});

  final String name;
  final String description;
}

class _NewGroupDialog extends StatefulWidget {
  const _NewGroupDialog();

  @override
  State<_NewGroupDialog> createState() => _NewGroupDialogState();
}

class _NewGroupDialogState extends State<_NewGroupDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();

  @override
  void dispose() {
    _nameCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.pop(
      context,
      _NewGroupFormResult(
        name: _nameCtrl.text.trim(),
        description: _descriptionCtrl.text.trim(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final screenWidth = MediaQuery.sizeOf(context).width;
    final sideInset = screenWidth * 0.10;
    final dialogWidth = screenWidth - (sideInset * 2);

    return PopScope(
      canPop: false,
      child: Dialog(
        insetPadding: EdgeInsets.symmetric(horizontal: sideInset, vertical: 24),
        child: SizedBox(
          width: dialogWidth,
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('New group', style: theme.textTheme.titleLarge),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _nameCtrl,
                      autofocus: true,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(labelText: 'Group name'),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Enter a group name';
                        }
                        return null;
                      },
                      onFieldSubmitted: (_) => _submit(),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _descriptionCtrl,
                      maxLines: 3,
                      maxLength: 1000,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: const InputDecoration(
                        labelText: 'Description',
                        alignLabelWithHint: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 8),
                        FilledButton(
                          onPressed: _submit,
                          child: const Text('Create'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

