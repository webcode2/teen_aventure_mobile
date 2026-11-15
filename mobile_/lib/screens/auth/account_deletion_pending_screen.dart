import 'package:flutter/material.dart';

import '../../services/api_client.dart';
import '../../theme.dart';
import '../account/individual_account_deletion_screen.dart';
import 'auth_chrome.dart';

/// The server's answer when the right password belongs to an account awaiting deletion.
const pendingDeletionCode = 'ACCOUNT_PENDING_DELETION';

/// Shows the pending-deletion screen for that answer. Returns false for any other error.
bool showIfPendingDeletion(BuildContext context, Object error) {
  if (error is! ApiException || error.code != pendingDeletionCode) return false;
  Navigator.of(context).push(
    MaterialPageRoute<void>(
      builder: (_) => AccountDeletionPendingScreen(message: error.message),
    ),
  );
  return true;
}

/// Signing in still works while an account waits to be deleted, but no session is
/// issued: the person only sees this notice until the account is deleted or restored.
class AccountDeletionPendingScreen extends StatelessWidget {
  const AccountDeletionPendingScreen({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return AuthChrome(
      title: 'Account deletion pending',
      showBack: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.hourglass_top_rounded, size: 48, color: AppColors.orange),
          const SizedBox(height: 16),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w700,
              fontSize: 16,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 12),
          const Text(
            'Changed your mind? You can restore your account until that date.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const IndividualAccountDeletionScreen()),
            ),
            child: const Text('Restore my account'),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Back to sign in'),
          ),
        ],
      ),
    );
  }
}
