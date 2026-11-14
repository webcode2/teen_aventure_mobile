import 'package:flutter/material.dart';

import '../../../theme.dart';

/// Navy gradient banner with a round avatar overlapping its lower edge, a title and a
/// status badge. Shared by the group/family details header and the profile card.
class HeroBanner extends StatelessWidget {
  const HeroBanner({
    super.key,
    required this.avatar,
    required this.title,
    required this.badge,
    this.topInset = 0,
    this.trailing,
    this.borderRadius,
  });

  /// Content of the 88px avatar circle (an icon or an initial).
  final Widget avatar;
  final String title;
  final String badge;
  /// Extra space above the avatar row (status bar plus a navigation row).
  final double topInset;
  final Widget? trailing;
  final BorderRadius? borderRadius;

  static const bannerHeight = 132.0;

  @override
  Widget build(BuildContext context) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          height: topInset + bannerHeight,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: borderRadius,
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.navy, Color(0xFF0A3A5C), Color(0xFF0E5A6A)],
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(20, topInset + 56, 20, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
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
                alignment: Alignment.center,
                child: avatar,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
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
                          badge,
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
              if (trailing != null) Padding(padding: const EdgeInsets.only(bottom: 6), child: trailing),
            ],
          ),
        ),
      ],
    );
  }
}
