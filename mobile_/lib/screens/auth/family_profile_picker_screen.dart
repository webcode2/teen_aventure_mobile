import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../theme.dart';
import '../shared/widgets/adventure_logo.dart';
import 'child_pin_screen.dart';
import 'child_teen_login_screen.dart';

class FamilyProfilePickerScreen extends StatelessWidget {
  const FamilyProfilePickerScreen({super.key});

  void _openChildProfile(BuildContext context, FamilyChildProfile child) {
    // Independent-login teens: email/password and end the parent session.
    // Younger explorers: PIN (or parent switch) and keep a restore stash.
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
  }

  static const _avatarColors = [
    AppColors.orange,
    AppColors.teal,
    AppColors.forestGreen,
    AppColors.navy,
  ];

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final parentName = session.displayName?.trim().isNotEmpty == true
        ? session.displayName!
        : '';

    return Scaffold(
      backgroundColor: AppColors.navy,
      body: Column(
        children: [
          const SafeArea(
            bottom: false,
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: AdventureLogo(height: 72),
            ),
          ),
          Expanded(
            child: ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
              child: ColoredBox(
                color: AppColors.cream,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 32),
                  children: [
                    const Text(
                      'Who is on the Quest?',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w900,
                        fontSize: 22,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const SizedBox(height: 22),
                    _FamilyTogetherCard(
                      parentName: parentName,
                      onTap: () => session.chooseParentProfile(),
                    ),
                    const SizedBox(height: 14),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: session.children.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 0.88,
                      ),
                      itemBuilder: (context, i) {
                        final child = session.children[i];
                        return _WatcherCard(
                          name: child.name,
                          subtitle: child.isUnderAge ? 'Explorer' : 'Teen',
                          color: _avatarColors[i % _avatarColors.length],
                          onTap: () => _openChildProfile(context, child),
                        );
                      },
                    ),
                    const SizedBox(height: 28),
                    TextButton(
                      onPressed: () => session.logout(),
                      child: const Text(
                        'Sign out',
                        style: TextStyle(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FamilyTogetherCard extends StatelessWidget {
  const _FamilyTogetherCard({
    required this.parentName,
    required this.onTap,
  });

  final String parentName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      elevation: 0,
      shadowColor: AppColors.navy.withValues(alpha: 0.08),
      borderRadius: AppRadii.cardRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.cardRadius,
        child: Container(
          padding: const EdgeInsets.fromLTRB(14, 14, 16, 14),
          decoration: BoxDecoration(
            borderRadius: AppRadii.cardRadius,
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.sageContainer,
                ),
                clipBehavior: Clip.antiAlias,
                child: const Icon(
                  Icons.groups_rounded,
                  color: AppColors.navy,
                  size: 28,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      parentName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Family home',
                      style: TextStyle(
                        color: AppColors.navy,
                        fontWeight: FontWeight.w800,
                        fontSize: 13,
                      ),
                    ),
 ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WatcherCard extends StatelessWidget {
  const _WatcherCard({
    required this.name,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  final String name;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();
    return Material(
      color: AppColors.surface,
      borderRadius: AppRadii.cardRadius,
      child: InkWell(
        onTap: onTap,
        borderRadius: AppRadii.cardRadius,
        child: Container(
          padding: const EdgeInsets.fromLTRB(12, 18, 12, 14),
          decoration: BoxDecoration(
            borderRadius: AppRadii.cardRadius,
            border: Border.all(color: AppColors.border),
            boxShadow: [
              BoxShadow(
                color: AppColors.navy.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color,
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.28),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  initial,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    fontSize: 28,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.navy,
                  fontWeight: FontWeight.w800,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.star_rounded,
                    size: 14,
                    color: AppColors.gold,
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    Icons.vpn_key_rounded,
                    size: 14,
                    color: AppColors.teal.withValues(alpha: 0.9),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
