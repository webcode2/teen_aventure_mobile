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
  return _showFamilyInvitation(
    context,
    title: 'Invite guardian',
    instructions: 'Enter the email they use for their app account. They can accept or decline '
        'the invite from their notifications.',
    familyName: familyName,
    send: (email, _, __) async {
      await service.createInvite(kind: 'FAMILY', familyId: familyId, email: email);
    },
    confirmation: 'Invite sent.',
  );
}

Future<bool> showAddAdultExplorerDialog(
  BuildContext context, {
  required Future<void> Function() beforeAdd,
  String? familyName,
}) async {
  final service = context.read<FamilyService>();
  final create = await showDialog<bool>(
    context: context,
    builder: (ctx) => SimpleDialog(
      title: const Text('Add adult explorer'),
      children: [
        SimpleDialogOption(
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Create adult profile'),
        ),
        SimpleDialogOption(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Invite existing account'),
        ),
      ],
    ),
  );
  if (create == null || !context.mounted) return false;
  return _showFamilyInvitation(
    context,
    title: create ? 'Create adult profile' : 'Invite existing account',
    instructions: create
        ? 'For ages 20 and over. They join the family now and receive a private link to set their password.'
        : 'Enter the email for their existing adult account. They join the family when they accept.',
    familyName: familyName,
    createAdult: create,
    send: (email, name, birthYear) async {
      await beforeAdd();
      if (create) {
        await service.createAdultExplorer(email: email, name: name, birthYear: birthYear!);
      } else {
        await service.inviteAdultExplorer(email);
      }
    },
    confirmation: create
        ? 'Adult explorer added. Password setup is pending.'
        : 'Adult explorer invitation pending acceptance.',
  );
}

Future<bool> _showFamilyInvitation(
  BuildContext context, {
  required String title,
  required String instructions,
  required Future<void> Function(String email, String name, int? birthYear) send,
  required String confirmation,
  String? familyName,
  bool createAdult = false,
}) async {
  final form = GlobalKey<FormState>();
  var email = '';
  var name = '';
  int? birthYear;
  var busy = false;
  String? error;
  final sent = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, update) => PopScope(
        canPop: !busy,
        child: AlertDialog(
          title: Text(title),
          scrollable: true,
          content: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$instructions${familyName == null ? '' : '\n\nFamily: $familyName'}',
                  style: const TextStyle(color: AppColors.textSecondary, height: 1.35),
                ),
                const SizedBox(height: 12),
                if (createAdult) ...[
                  TextFormField(
                    enabled: !busy,
                    textCapitalization: TextCapitalization.words,
                    maxLength: 80,
                    onChanged: (value) => name = value.trim(),
                    validator: (_) => name.isEmpty ? 'Enter a name' : null,
                    decoration: const InputDecoration(labelText: 'Name'),
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    enabled: !busy,
                    keyboardType: TextInputType.number,
                    onChanged: (value) => birthYear = int.tryParse(value.trim()),
                    validator: (_) {
                      final year = birthYear;
                      if (year == null || year < 1900) return 'Enter a valid birth year';
                      return DateTime.now().toUtc().year - year < 20
                          ? 'Adult explorers must be 20 or older'
                          : null;
                    },
                    decoration: const InputDecoration(labelText: 'Birth year'),
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(
                  key: const ValueKey('invite-guardian-email'),
                  initialValue: email,
                  enabled: !busy,
                  onChanged: (value) => email = value,
                  keyboardType: TextInputType.emailAddress,
                  autofocus: !createAdult,
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
                        await send(email.trim(), name, birthYear);
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
              child: Text(createAdult ? (busy ? 'Adding…' : 'Add adult explorer') : (busy ? 'Sending…' : 'Send invite')),
            ),
          ],
        ),
      ),
    ),
  );
  if (sent == true && context.mounted) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(confirmation), backgroundColor: AppColors.navy),
    );
  }
  return sent == true;
}
