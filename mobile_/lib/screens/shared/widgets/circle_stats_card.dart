import 'package:flutter/material.dart';
import '../../../theme.dart';

class CircleStat {
  const CircleStat({
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
    this.emphasize = false,
  });

  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;
  final bool emphasize;
}

/// Three-up stats card used on Groups.
class CircleStatsCard extends StatelessWidget {
  const CircleStatsCard({
    super.key,
    required this.title,
    required this.subtitle,
    required this.stats,
    this.empty = false,
    this.emptyLabel = 'No groups yet',
  });

  final String title;
  final String subtitle;
  final List<CircleStat> stats;
  final bool empty;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Color(0xFFFFE4C8),
                  Color(0xFFFFF1E0),
                  Color(0xFFE6F6F6),
                ],
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.orange.withValues(alpha: 0.18),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.insights_rounded,
                    size: 20,
                    color: AppColors.orange,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          color: AppColors.navy,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (empty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 18),
              child: Text(
                emptyLabel,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  color: AppColors.textMuted,
                ),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 14, 8, 16),
              child: Row(
                children: [
                  for (var i = 0; i < stats.length; i++) ...[
                    if (i > 0) const _StatDivider(),
                    _StatCell(stat: stats[i]),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _StatDivider extends StatelessWidget {
  const _StatDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 44,
      color: AppColors.border.withValues(alpha: 0.9),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.stat});

  final CircleStat stat;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(stat.icon, size: 18, color: stat.iconColor),
          const SizedBox(height: 6),
          Text(
            stat.value,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: stat.emphasize ? 26 : 24,
              height: 1,
              letterSpacing: -0.6,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            stat.label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
            ),
          ),
        ],
      ),
    );
  }
}
