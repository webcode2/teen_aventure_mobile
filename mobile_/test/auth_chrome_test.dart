import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/auth/auth_chrome.dart';

void main() {
  Future<void> pumpAt(WidgetTester tester, Size size, {Widget? child}) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        home: AuthChrome(
          title: 'Sign in',
          child: child ?? const Text('form'),
        ),
      ),
    );
    await tester.pump();
  }

  testWidgets('AuthChrome does not overflow at a 1×1 first frame', (tester) async {
    await pumpAt(tester, const Size(1, 1));

    expect(tester.takeException(), isNull);
  });

  testWidgets('AuthChrome does not overflow on a short phone viewport', (tester) async {
    await pumpAt(
      tester,
      const Size(375, 320),
      child: const SizedBox(height: 420, child: Text('tall form')),
    );

    expect(tester.takeException(), isNull);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('tall form'), findsOneWidget);
  });
}
