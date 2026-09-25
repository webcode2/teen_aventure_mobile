import 'package:flutter/material.dart';
import '../../../theme.dart';

enum AdventureTab { home, bible, quests, rewards, groups, account }

class AdventureBottomNav extends StatelessWidget {
  const AdventureBottomNav({
    super.key,
    required this.current,
    required this.onSelect,
  });

  final AdventureTab current;
  final ValueChanged<AdventureTab> onSelect;

  static const _items = <({AdventureTab tab, String label, IconData icon})>[
    (tab: AdventureTab.home, label: 'Home', icon: Icons.home_rounded),
    (tab: AdventureTab.rewards, label: 'Achievements', icon: Icons.emoji_events_rounded),
    (tab: AdventureTab.quests, label: 'Quest', icon: Icons.explore_rounded),
    (tab: AdventureTab.groups, label: 'Groups', icon: Icons.groups_rounded),
    (tab: AdventureTab.account, label: 'Profile', icon: Icons.person_outline_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const ValueKey('nav-color-v3'),
      color: AppColors.navy,
      padding: const EdgeInsets.fromLTRB(4, 8, 4, 10),
      child: SafeArea(
        top: false,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (final item in _items)
              _NavItem(
                tab: item.tab,
                label: item.label,
                icon: item.icon,
                current: current,
                onSelect: onSelect,
              ),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.tab,
    required this.label,
    required this.icon,
    required this.current,
    required this.onSelect,
  });

  final AdventureTab tab;
  final String label;
  final IconData icon;
  final AdventureTab current;
  final ValueChanged<AdventureTab> onSelect;

  static const double _iconSize = 22;

  @override
  Widget build(BuildContext context) {
    final selected = current == tab;
    final color = selected ? AppColors.orange : AppColors.cream;
    final labelBase = Theme.of(context).textTheme.labelMedium;
    final labelStyle = labelBase?.copyWith(
          color: color,
          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
          height: 1.1,
          fontSize: (labelBase.fontSize ?? 13) - 2,
        );

    return Expanded(
      child: InkWell(
        onTap: () => onSelect(tab),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: _iconSize,
              child: Icon(icon, color: color, size: _iconSize),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: labelStyle,
            ),
          ],
        ),
      ),
    );
  }
}
