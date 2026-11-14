import 'package:flutter/material.dart';

import '../../theme.dart';

/// A family invite sent to this account's email, answered right here.
class FamilyInviteCard extends StatelessWidget {
  const FamilyInviteCard({
    super.key,
    required this.name,
    required this.invitedBy,
    required this.onAccept,
    required this.onDecline,
  });

  final String name;
  final String? invitedBy;
  final VoidCallback onAccept;
  final VoidCallback onDecline;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.home_rounded, color: AppColors.orange),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Join $name?',
                  style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.navy),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            '${invitedBy == null ? 'You were invited to this family.' : '$invitedBy invited you to this family.'} '
            'Your points will count for the family. You can leave at any time.',
            style: const TextStyle(color: AppColors.textSecondary, height: 1.35),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(onPressed: onDecline, child: const Text('Decline')),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: onAccept,
                style: FilledButton.styleFrom(backgroundColor: AppColors.navy),
                child: const Text('Join family'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
