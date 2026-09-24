import 'package:flutter/material.dart';
import '../../../theme.dart';

/// Shared navigable list row matching the Groups design guide:
/// tinted icon tile · title / subtitle · accent chevron.
class AdventureListCard extends StatelessWidget {
  const AdventureListCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    this.onTap,
    this.accent = AdventureListAccent.teal,
    this.trailing,
    this.leading,
    this.dense = false,
  });

  final String title;
  final String? subtitle;
  final IconData icon;
  final VoidCallback? onTap;
  final AdventureListAccent accent;
  final Widget? trailing;
  final Widget? leading;
  final bool dense;

  static AdventureListAccent accentForKind(String? kind) {
    switch ((kind ?? '').toUpperCase()) {
      case 'FAMILY':
        return AdventureListAccent.orange;
      case 'CHURCH':
        return AdventureListAccent.teal;
      case 'CLASS':
        return AdventureListAccent.green;
      default:
        return AdventureListAccent.navy;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = accent.colors;
    final pad = dense
        ? const EdgeInsets.fromLTRB(10, 10, 8, 10)
        : const EdgeInsets.fromLTRB(12, 12, 10, 12);

    final card = Material(
      color: AppColors.surface,
      borderRadius: AppRadii.cardRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.cardRadius,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: AppRadii.cardRadius,
            border: Border.all(color: AppColors.border.withValues(alpha: 0.9)),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: 0.04),
                blurRadius: 10,
                offset: const Offset(0, 3),
              ),
            ],
          ),
          child: Padding(
            padding: pad,
            child: Row(
              children: [
                leading ??
                    Container(
                      width: dense ? 40 : 44,
                      height: dense ? 40 : 44,
                      decoration: BoxDecoration(
                        color: colors.tint,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(icon, color: colors.accent, size: dense ? 20 : 22),
                    ),
                SizedBox(width: dense ? 10 : 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: dense ? 14 : 15,
                          color: AppColors.navy,
                          letterSpacing: -0.2,
                        ),
                      ),
                      if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Text(
                          subtitle!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: dense ? 11 : 12,
                            fontWeight: FontWeight.w600,
                            height: 1.25,
                            color: accent == AdventureListAccent.danger
                                ? colors.accent
                                : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null)
                  trailing!
                else if (onTap != null)
                  Icon(
                    Icons.chevron_right_rounded,
                    color: colors.accent.withValues(alpha: 0.9),
                  ),
              ],
            ),
          ),
        ),
      ),
    );

    return card;
  }
}

enum AdventureListAccent { orange, teal, green, gold, navy, danger }

extension on AdventureListAccent {
  ({Color tint, Color accent}) get colors {
    switch (this) {
      case AdventureListAccent.orange:
        return (tint: AppColors.terracottaContainer, accent: AppColors.orange);
      case AdventureListAccent.teal:
        return (tint: AppColors.puzzleTealTint, accent: AppColors.teal);
      case AdventureListAccent.green:
        return (tint: AppColors.sageContainer, accent: AppColors.forestGreen);
      case AdventureListAccent.gold:
        return (tint: AppColors.surfaceVariant, accent: AppColors.gold);
      case AdventureListAccent.navy:
        return (tint: const Color(0xFFE6F0F8), accent: AppColors.navy);
      case AdventureListAccent.danger:
        return (tint: const Color(0xFFFFDAD6), accent: const Color(0xFFBA1A1A));
    }
  }
}
