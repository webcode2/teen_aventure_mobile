import 'package:flutter/material.dart';
import '../../../config/demo_account.dart';
import '../../../theme.dart';

class DemoAccountActions extends StatelessWidget {
  const DemoAccountActions({
    super.key,
    required this.label,
    required this.hint,
    required this.onUse,
    this.enabled = true,
  });

  final String label;
  final String hint;
  final VoidCallback onUse;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    if (!DemoAccount.enabled) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: enabled ? onUse : null,
          child: Text(label),
        ),
        if (hint.trim().isNotEmpty) ...[
          const SizedBox(height: 6),
          Text(
            hint,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 11, color: AppColors.textMuted, height: 1.35),
          ),
        ],
      ],
    );
  }
}
