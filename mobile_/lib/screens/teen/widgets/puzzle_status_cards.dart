import 'package:flutter/material.dart';

import '../../../theme.dart';

/// Shown when a puzzle fails the thin client guard (bounds / collision / empty).
class PuzzleRejectCard extends StatelessWidget {
  const PuzzleRejectCard({
    super.key,
    required this.message,
    this.onSkip,
    this.onReport,
  });

  final String message;
  final VoidCallback? onSkip;
  final VoidCallback? onReport;

  @override
  Widget build(BuildContext context) {
    return _PuzzleStatusCard(
      icon: Icons.error_outline_rounded,
      title: 'This puzzle can’t be played',
      body: message,
      primaryLabel: 'Skip',
      onPrimary: onSkip ?? () => Navigator.maybePop(context),
      secondaryLabel: 'Report',
      onSecondary: onReport,
    );
  }
}

/// Shown when schemaVersion is newer than this build, or type is unknown.
class PuzzleUpdateAppCard extends StatelessWidget {
  const PuzzleUpdateAppCard({
    super.key,
    this.detail,
    this.onBack,
  });

  final String? detail;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return _PuzzleStatusCard(
      icon: Icons.system_update_alt_rounded,
      title: 'Update the app',
      body: detail ??
          'This puzzle needs a newer version of Teen Bible Adventures.',
      primaryLabel: 'Back',
      onPrimary: onBack ?? () => Navigator.maybePop(context),
    );
  }
}

class _PuzzleStatusCard extends StatelessWidget {
  const _PuzzleStatusCard({
    required this.icon,
    required this.title,
    required this.body,
    required this.primaryLabel,
    required this.onPrimary,
    this.secondaryLabel,
    this.onSecondary,
  });

  final IconData icon;
  final String title;
  final String body;
  final String primaryLabel;
  final VoidCallback? onPrimary;
  final String? secondaryLabel;
  final VoidCallback? onSecondary;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 360),
        child: Card(
          margin: const EdgeInsets.all(24),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 40, color: AppColors.navy),
                const SizedBox(height: 12),
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  body,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    height: 1.35,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    if (secondaryLabel != null) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: onSecondary,
                          child: Text(secondaryLabel!),
                        ),
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: FilledButton(
                        onPressed: onPrimary,
                        child: Text(primaryLabel),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
