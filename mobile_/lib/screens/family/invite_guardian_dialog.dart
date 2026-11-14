import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/error_text.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../auth/auth_chrome.dart';

/// Sends a family invite to someone's account by email. They get one push and the invite
/// waits in their notification inbox until they accept or decline. Returns true when sent.
Future<bool> showInviteGuardianDialog(BuildContext context, {required String familyId, String? familyName}) async {
  final service = context.read<FamilyService>();
  final form = GlobalKey<FormState>();
  final email = TextEditingController();
  var busy = false;
  String? error;
  final sent = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, update) => PopScope(
        canPop: !busy,
        child: AlertDialog(
          title: const Text('Invite guardian'),
          scrollable: true,
          content: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Enter the email they use for their app account. They can accept or decline '
                  'the invite from their notifications.${familyName == null ? '' : '\n\nFamily: $familyName'}',
                  style: const TextStyle(color: AppColors.textSecondary, height: 1.35),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  key: const ValueKey('invite-guardian-email'),
                  controller: email,
                  keyboardType: TextInputType.emailAddress,
                  autofocus: true,
                  validator: (v) => validateEmail(v ?? ''),
                  decoration: const InputDecoration(labelText: 'Email'),
                ),
                if (error != null) ...[
                  const SizedBox(height: 8),
                  Text(error!, style: TextStyle(color: Theme.of(ctx).colorScheme.error)),
                ],
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: busy ? null : () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: busy
                  ? null
                  : () async {
                      if (form.currentState?.validate() != true) return;
                      update(() {
                        busy = true;
                        error = null;
                      });
                      try {
                        await service.createInvite(kind: 'FAMILY', familyId: familyId, email: email.text.trim());
                        if (ctx.mounted) Navigator.pop(ctx, true);
                      } catch (e) {
                        if (ctx.mounted) {
                          update(() {
                            busy = false;
                            error = errorText(e);
                          });
                        }
                      }
                    },
              child: Text(busy ? 'Sending…' : 'Send invite'),
            ),
          ],
        ),
      ),
    ),
  );
  if (sent == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invite sent.'), backgroundColor: AppColors.navy),
    );
  }
  return sent == true;
}
