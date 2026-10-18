import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../services/api_client.dart';
import '../../services/content_service.dart';
import '../../services/engagement_service.dart';
import '../../theme.dart';

/// Rankings for a single group, shown inside group detail only.
class GroupStandingBoard extends StatefulWidget {
  const GroupStandingBoard({
    super.key,
    this.entriesOverride,
    this.classId,
    this.canNudge = false,
  });

  final List<LeaderboardEntry>? entriesOverride;
  final String? classId;
  /// Group owner (or teacher) can cheer one member or everyone.
  final bool canNudge;

  @override
  State<GroupStandingBoard> createState() => _GroupStandingBoardState();
}

class _GroupStandingBoardState extends State<GroupStandingBoard> {
  List<LeaderboardEntry> _rows = const [];
  List<NudgeTemplate> _cheers = const [];
  bool _loading = true;
  bool _sending = false;
  String? _error;
  String? _classId;

  @override
  void initState() {
    super.initState();
    final override = widget.entriesOverride;
    if (override != null) {
      _rows = override;
      _loading = false;
      _classId = widget.classId;
    } else {
      _classId = widget.classId;
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (override == null) {
        _load();
      } else if (widget.canNudge) {
        _loadCheers();
      }
    });
  }

  @override
  void didUpdateWidget(covariant GroupStandingBoard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.entriesOverride != null && widget.entriesOverride != oldWidget.entriesOverride) {
      _rows = widget.entriesOverride!;
      _loading = false;
      _error = null;
      _classId = widget.classId ?? _classId;
    }
    if (widget.canNudge && !oldWidget.canNudge && _cheers.isEmpty) {
      _loadCheers();
    }
  }

  Future<void> _loadCheers() async {
    if (!widget.canNudge) return;
    try {
      final cheers = await context.read<EngagementService>().getNudgeTemplates(
            classId: widget.classId ?? _classId,
          );
      if (mounted) setState(() => _cheers = cheers);
    } catch (_) {
      if (mounted) setState(() => _cheers = const []);
    }
  }

  Future<void> _load() async {
    final override = widget.entriesOverride;
    if (override != null) {
      setState(() {
        _rows = override;
        _loading = false;
        _error = null;
      });
      await _loadCheers();
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final session = context.read<AuthSession>();
      if (_classId == null) {
        _classId = widget.classId;
        final classes = session.allAssignedClasses;
        final preferred = classes.isNotEmpty ? classes.first : null;
        _classId ??= preferred?.id;
      }
      if (_classId == null) {
        _rows = const [];
      } else {
        _rows = await context.read<ContentService>().getClassLeaderboard(_classId!);
      }
      if (widget.canNudge) {
        try {
          _cheers = await context.read<EngagementService>().getNudgeTemplates(
                classId: _classId ?? widget.classId,
              );
        } catch (_) {
          _cheers = const [];
        }
      }
    } catch (e) {
      _error = e is ApiException ? e.message : e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _nudgeOne(String childId, String templateId) async {
    if (_sending) return;
    setState(() => _sending = true);
    try {
      await context.read<EngagementService>().sendNudge(
            childId: childId,
            templateId: templateId,
            classId: _classId ?? widget.classId,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cheer sent'), backgroundColor: AppColors.navy),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _nudgeAll(String templateId) async {
    final classId = _classId ?? widget.classId;
    if (classId == null || _sending) return;
    setState(() => _sending = true);
    try {
      final count = await context.read<EngagementService>().sendGroupNudge(
            classId: classId,
            templateId: templateId,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(count == 1 ? 'Cheer sent to 1 member' : 'Cheer sent to $count members'),
          backgroundColor: AppColors.navy,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final parentView = session.userRole == UserRole.parent;
    final canNudge = widget.canNudge && !_sending && _cheers.isNotEmpty;

    if (_loading) {
      return const SizedBox(height: 48, child: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(8),
        child: Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
      );
    }

    if (_classId == null && widget.entriesOverride == null) {
      return const _StandingListCard(
        padded: true,
        child: Text('Join a class to see ranks.', style: TextStyle(color: AppColors.textMuted)),
      );
    }
    if (_rows.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (canNudge && (_classId ?? widget.classId) != null) ...[
            _CheerAllButton(enabled: canNudge, cheers: _cheers, onSelected: _nudgeAll),
            const SizedBox(height: 10),
          ],
          const _StandingListCard(
            padded: true,
            child: Text(
              'No points yet. Watch lessons and finish quizzes to appear here.',
              style: TextStyle(color: AppColors.textMuted),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (canNudge) ...[
          _CheerAllButton(enabled: canNudge, cheers: _cheers, onSelected: _nudgeAll),
          const SizedBox(height: 10),
        ],
        if (parentView && _rows.any((row) => row.isBlurred)) ...[
          const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: Text('Only your explorers’ full names and points are visible.', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ),
        ],
        _StandingListCard(
          child: Column(
            children: [
              for (var i = 0; i < _rows.length; i++)
                _StandingActivityRow(
                  item: _rows[i],
                  showDivider: i < _rows.length - 1,
                  mineLabel: parentView ? 'Your explorer' : 'You',
                  canNudge: canNudge &&
                      !_rows[i].isMine &&
                      !_rows[i].isBlurred &&
                      (_rows[i].childId?.isNotEmpty ?? false),
                  cheers: _cheers,
                  onCheer: (key) => _nudgeOne(_rows[i].childId!, key),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _CheerAllButton extends StatelessWidget {
  const _CheerAllButton({
    required this.enabled,
    required this.cheers,
    required this.onSelected,
  });

  final bool enabled;
  final List<NudgeTemplate> cheers;
  final ValueChanged<String> onSelected;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerRight,
      child: PopupMenuButton<String>(
        enabled: enabled,
        onSelected: onSelected,
        itemBuilder: (_) => [
          for (final n in cheers) PopupMenuItem(value: n.id, child: Text(n.message)),
        ],
        child: Opacity(
          opacity: enabled ? 1 : 0.5,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: AppColors.terracottaContainer.withValues(alpha: 0.35),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.favorite_outline, size: 18, color: AppColors.navy),
                SizedBox(width: 6),
                Text(
                  'Cheer all',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.navy),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StandingListCard extends StatelessWidget {
  const _StandingListCard({required this.child, this.padded = false});

  final Widget child;
  final bool padded;

  static final _radius = BorderRadius.circular(8);
  static final _outline = Border.all(
    color: AppColors.navy.withValues(alpha: 0.28),
    width: 1.5,
  );

  @override
  Widget build(BuildContext context) {
    // Stroke is foreground so opaque row fills cannot paint over it.
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: _radius,
      ),
      foregroundDecoration: BoxDecoration(
        borderRadius: _radius,
        border: _outline,
      ),
      child: padded ? Padding(padding: const EdgeInsets.all(16), child: child) : child,
    );
  }
}

class _StandingActivityRow extends StatelessWidget {
  const _StandingActivityRow({
    required this.item,
    this.showDivider = false,
    this.mineLabel = 'You',
    this.canNudge = false,
    this.cheers = const [],
    this.onCheer,
  });

  final LeaderboardEntry item;
  final bool showDivider;
  final String mineLabel;
  final bool canNudge;
  final List<NudgeTemplate> cheers;
  final ValueChanged<String>? onCheer;

  static const _avatarPalette = [
    AppColors.terracottaContainer,
    AppColors.sageContainer,
    AppColors.puzzleTealTint,
    AppColors.surfaceVariant,
    Color(0xFFE6F0F8),
  ];

  String get _displayName {
    if (item.isBlurred) return '${item.childName.trim().split(RegExp(r'\s+')).first} ••••';
    return item.childName;
  }

  String get _actionLabel {
    if (item.isMine) return mineLabel;
    switch (item.rank) {
      case 1:
        return 'Leading the board';
      case 2:
        return 'Close behind';
      case 3:
        return 'On the podium';
      default:
        return 'Rank ${item.rank}';
    }
  }

  String get _initial {
    final name = _displayName.trim();
    if (name.isEmpty) return '?';
    return name[0].toUpperCase();
  }

  Color get _avatarColor => _avatarPalette[item.rank % _avatarPalette.length];

  @override
  Widget build(BuildContext context) {
    final isMine = item.isMine;
    final isBlurred = item.isBlurred;

    return DecoratedBox(
      decoration: BoxDecoration(
        border: showDivider
            ? Border(bottom: BorderSide(color: AppColors.navy.withValues(alpha: 0.12)))
            : null,
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
        child: Row(
          children: [
            CircleAvatar(
              radius: 22,
              backgroundColor: _avatarColor,
              child: Text(
                _initial,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 16,
                  color: AppColors.navy,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 15,
                      color: isBlurred ? AppColors.textMuted : AppColors.navy,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _actionLabel,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: isMine ? AppColors.orange : AppColors.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  isBlurred ? '••• pts' : '${item.points} pts',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: AppColors.forestGreen,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '#${item.rank}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
            if (canNudge && onCheer != null && cheers.isNotEmpty) ...[
              const SizedBox(width: 4),
              PopupMenuButton<String>(
                tooltip: 'Send cheer',
                onSelected: onCheer,
                itemBuilder: (_) => [
                  for (final n in cheers) PopupMenuItem(value: n.id, child: Text(n.message)),
                ],
                child: const Padding(
                  padding: EdgeInsets.all(6),
                  child: Icon(Icons.favorite_outline, size: 20, color: AppColors.orange),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
