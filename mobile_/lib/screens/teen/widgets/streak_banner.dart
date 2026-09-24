import 'package:flutter/material.dart';
import '../../../models/week_quest_progress.dart';
import '../../../theme.dart';

class StreakBanner extends StatelessWidget {
  const StreakBanner({
    super.key,
    required this.progress,
    this.headline,
    this.subtitle,
    this.child,
    this.compact = false,
  });

  final WeekQuestProgress progress;
  final String? headline;
  final String? subtitle;
  final Widget? child;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final done = progress.completed;
    final total = WeekQuestProgress.totalSessions;
    final sessions =
        progress.marks.map((mark) => _fullSessionName(mark.label)).join(' · ');
    final streakRow = Row(
      children: [
        Container(
          width: 34,
          height: 34,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.18),
            shape: BoxShape.circle,
          ),
          child:
              const Center(child: Text('🔥', style: TextStyle(fontSize: 28))),
        ),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            done >= total ? 'Week complete! $sessions' : sessions,
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
              fontSize: 11,
              height: 1.25,
            ),
          ),
        ),
      ],
    );

    return Container(
      padding: headline != null
          ? EdgeInsets.fromLTRB(compact ? 10 : 12, compact ? 8 : 10,
              compact ? 8 : 8, compact ? 6 : 8)
          : const EdgeInsets.fromLTRB(8, 8, 8, 8),
      decoration: BoxDecoration(
        color: AppColors.forestGreen,
        borderRadius: AppRadii.cardRadius,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (headline != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    headline!,
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: compact ? 14 : 17,
                      height: 1.15,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                _SealBadge(count: done, size: compact ? 42 : 48),
              ],
            ),
            if (subtitle != null && !compact) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.88),
                  height: 1.3,
                  fontSize: 12,
                ),
              ),
            ],
            if (child != null) ...[
              SizedBox(height: compact ? 8 : 10),
              child!,
            ],
            SizedBox(height: compact ? 10 : 12),
          ],
          streakRow,
        ],
      ),
    );
  }
}

class WeeklyQuestStreak extends StatelessWidget {
  const WeeklyQuestStreak({
    super.key,
    required this.weekNumber,
    required this.progress,
    this.stats,
    this.child,
  });

  final int weekNumber;
  final WeekQuestProgress progress;
  final Widget? stats;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final done = progress.completed;
    final total = WeekQuestProgress.totalSessions;
    final sessions =
        progress.marks.map((mark) => _fullSessionName(mark.label)).join(' · ');
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 10, 8, 8),
      decoration: BoxDecoration(
        color: AppColors.forestGreen,
        borderRadius: AppRadii.cardRadius,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Week $weekNumber Quest',
            style: const TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 17,
              height: 1.1,
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                    child: Text('🔥', style: TextStyle(fontSize: 12))),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  done >= total ? 'Week complete! $sessions' : sessions,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                    height: 1.25,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
            ],
          ),
          if (stats != null) ...[
            const SizedBox(height: 10),
            stats!,
          ],
          if (child != null) ...[
            const SizedBox(height: 8),
            child!,
          ],
        ],
      ),
    );
  }
}

String _fullSessionName(String label) {
  switch (label) {
    case 'V1':
      return 'Video 1';
    case 'V2':
      return 'Video 2';
    case 'V3':
      return 'Video 3';
    case 'Puz':
      return 'Puzzle';
    default:
      return label;
  }
}

class _SealBadge extends StatefulWidget {
  const _SealBadge({required this.count, this.size = 44});

  final int count;
  final double size;

  @override
  State<_SealBadge> createState() => _SealBadgeState();
}

class _SealBadgeState extends State<_SealBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: Tween<double>(begin: 0.94, end: 1.06).animate(
        CurvedAnimation(parent: _pulse, curve: Curves.easeInOut),
      ),
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(
              Icons.workspace_premium_rounded,
              size: widget.size,
              color: AppColors.gold,
            ),
            Padding(
              padding: EdgeInsets.only(top: widget.size * 0.18),
              child: widget.count > 0
                  ? Text(
                      '${widget.count}',
                      style: TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w900,
                        fontSize: widget.size * 0.28,
                        height: 1,
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          ],
        ),
      ),
    );
  }
}
