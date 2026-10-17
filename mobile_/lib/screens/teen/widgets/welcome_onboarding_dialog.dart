import 'package:flutter/material.dart';

import '../../../providers/hero_copy.dart';
import '../../../theme.dart';

/// First-open prompt: welcome title, subtitle, and scripture over a navy wash.
class WelcomeOnboardingDialog extends StatelessWidget {
  const WelcomeOnboardingDialog({super.key, required this.welcome});

  final WelcomeCopy welcome;

  static const prefsKey = 'welcome_onboarding_seen_v1';

  /// First home open only. [seen] is the stored prefs flag.
  static bool shouldOffer({
    required bool alreadyOffered,
    required bool hasContent,
    required bool? seen,
  }) {
    if (alreadyOffered || !hasContent) return false;
    return seen != true;
  }

  @override
  Widget build(BuildContext context) {
    final title = welcome.title.trim().isEmpty ? WelcomeCopy.fallback.title : welcome.title.trim();
    final subtitle =
        welcome.subtitle.trim().isEmpty ? WelcomeCopy.fallback.subtitle : welcome.subtitle.trim();
    final quote = welcome.quote.trim();

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.cream,
          border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'WELCOME',
                style: TextStyle(
                  color: AppColors.teal,
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.4,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                title,
                style: const TextStyle(
                  color: AppColors.navy,
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  height: 1.15,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  height: 1.35,
                ),
              ),
              if (quote.isNotEmpty) ...[
                const SizedBox(height: 14),
                DecoratedBox(
                  decoration: const BoxDecoration(
                    color: Color(0xFFFFF8EE),
                    border: Border(left: BorderSide(color: AppColors.gold, width: 2)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                    child: Text(
                      quote,
                      style: const TextStyle(
                        color: AppColors.navy,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        fontStyle: FontStyle.italic,
                        height: 1.4,
                      ),
                    ),
                  ),
                ),
              ],
              const SizedBox(height: 18),
              Material(
                color: AppColors.navy,
                child: InkWell(
                  onTap: () => Navigator.of(context).pop(true),
                  child: const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Text(
                      'Continue',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
