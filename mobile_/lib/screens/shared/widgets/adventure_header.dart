import 'package:flutter/material.dart';
import '../../../theme.dart';
import 'adventure_logo.dart';

class AdventureHeader extends StatelessWidget {
  const AdventureHeader({
    super.key,
    required this.onMenu,
    this.onBell,
    this.bellBadge = 0,
    this.leading,
    this.trailing,
    this.actions = const [],
  });

  final VoidCallback onMenu;
  final VoidCallback? onBell;
  final int bellBadge;
  final Widget? leading;
  final Widget? trailing;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.navy,
      padding: EdgeInsets.fromLTRB(
        12,
        MediaQuery.paddingOf(context).top + 4,
        12,
        6,
      ),
      child: Stack(
        alignment: Alignment.center,
        children: [
          const IgnorePointer(child: AdventureLogo(height: 48)),
          Row(
            children: [
              leading ??
                  _ChromeIconButton(
                    icon: Icons.menu_rounded,
                    onTap: onMenu,
                  ),
              const Spacer(),
              for (final action in actions) ...[
                action,
                const SizedBox(width: 8),
              ],
              if (trailing != null) ...[
                trailing!,
                const SizedBox(width: 8),
              ],
              Stack(
                clipBehavior: Clip.none,
                children: [
                  _ChromeIconButton(
                    icon: Icons.notifications_none_rounded,
                    onTap: onBell ?? () {},
                  ),
                  if (bellBadge > 0)
                    Positioned(
                      right: -2,
                      top: -2,
                      child: Container(
                        width: 16,
                        height: 16,
                        decoration: BoxDecoration(
                          color: AppColors.orange,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          bellBadge > 9 ? '9+' : '$bellBadge',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class ChromeIconButton extends StatelessWidget {
  const ChromeIconButton({super.key, required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return _ChromeIconButton(icon: icon, onTap: onTap);
  }
}

class _ChromeIconButton extends StatelessWidget {
  const _ChromeIconButton({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: AppColors.cream.withValues(alpha: 0.45)),
        ),
        child: Icon(icon, color: AppColors.cream, size: 20),
      ),
    );
  }
}
