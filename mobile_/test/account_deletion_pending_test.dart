import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/auth/account_deletion_pending_screen.dart';
import 'package:teen_aventure/services/api_client.dart';

Widget _host(void Function(BuildContext) onTap) => MaterialApp(
      home: Builder(
        builder: (context) => TextButton(onPressed: () => onTap(context), child: const Text('Sign in')),
      ),
    );

void main() {
  testWidgets('a pending-deletion sign-in opens only the deletion notice', (tester) async {
    var shown = false;
    await tester.pumpWidget(_host((context) {
      shown = showIfPendingDeletion(
        context,
        ApiException(
          statusCode: 403,
          code: pendingDeletionCode,
          message: 'Your account is scheduled for permanent deletion on 2026-12-15.',
        ),
      );
    }));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(shown, isTrue);
    expect(find.text('Account deletion pending'), findsOneWidget);
    expect(find.textContaining('2026-12-15'), findsOneWidget);
    expect(find.text('Restore my account'), findsOneWidget);
  });

  testWidgets('other sign-in errors stay on the form', (tester) async {
    var shown = true;
    await tester.pumpWidget(_host((context) {
      shown = showIfPendingDeletion(context, ApiException(statusCode: 401, message: 'Invalid credentials'));
    }));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();
    expect(shown, isFalse);
    expect(find.text('Account deletion pending'), findsNothing);
  });
}
