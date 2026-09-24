import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../services/api_client.dart';
import '../../services/content_service.dart';
import '../../theme.dart';

/// Rankings for a single group, shown inside group detail only.
class GroupStandingBoard extends StatefulWidget {
  const GroupStandingBoard({
    super.key,
    this.entriesOverride,
    this.classId,
  });

  final List<LeaderboardEntry>? entriesOverride;
  final String? classId;

  @override
  State<GroupStandingBoard> createState() => _GroupStandingBoardState();
}

class _GroupStandingBoardState extends State<GroupStandingBoard> {
  List<LeaderboardEntry> _rows = const [];
  bool _loading = true;
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
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _load();
      });
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
    } catch (e) {
      _error = e is ApiException ? e.message : e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final parentView = session.userRole == UserRole.parent;

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
      return const _StandingListCard(
        padded: true,
        child: Text(
          'No scores yet. Finish an opened Teen Quest quiz to appear here.',
          style: TextStyle(color: AppColors.textMuted),
        ),
      );
    }

    return _StandingListCard(
      child: Column(
        children: [
          for (var i = 0; i < _rows.length; i++)
            _StandingActivityRow(
              item: _rows[i],
              showDivider: i < _rows.length - 1,
              mineLabel: parentView ? 'Your explorer' : 'You',
            ),
        ],
      ),
    );
  }
}

class _StandingListCard extends StatelessWidget {
  const _StandingListCard({required this.child, this.padded = false});

  final Widget child;
  final bool padded;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: padded ? Padding(padding: const EdgeInsets.all(16), child: child) : child,
    );
  }
}

class _StandingActivityRow extends StatelessWidget {
  const _StandingActivityRow({
    required this.item,
    this.showDivider = false,
    this.mineLabel = 'You',
  });

  final LeaderboardEntry item;
  final bool showDivider;
  final String mineLabel;

  static const _avatarPalette = [
    AppColors.terracottaContainer,
    AppColors.sageContainer,
    AppColors.puzzleTealTint,
    AppColors.surfaceVariant,
    Color(0xFFE6F0F8),
  ];

  String get _displayName {
    if (item.isBlurred) return 'Participant #${item.rank}';
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
        color: AppColors.surface,
        border: showDivider
            ? const Border(bottom: BorderSide(color: AppColors.border))
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
                  '${item.points} pts',
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
          ],
        ),
      ),
    );
  }
}
