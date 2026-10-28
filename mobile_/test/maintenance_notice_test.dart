import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/providers/hero_copy.dart';
import 'package:teen_aventure/services/api_client.dart';
import 'package:teen_aventure/screens/shared/widgets/maintenance_notice.dart';

void main() {
  testWidgets('maintenance notice appears only when enabled', (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
            body: MaintenanceNotice(
                enabled: false, message: 'Updating lessons'))));
    expect(find.text('Maintenance'), findsNothing);
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
            body: MaintenanceNotice(
                enabled: true, message: 'Updating lessons'))));
    expect(find.text('Maintenance'), findsOneWidget);
    expect(find.text('Updating lessons'), findsOneWidget);
  });
  testWidgets(
      'maintenance uses a dark status-bar surface and readable foreground',
      (tester) async {
    await tester.pumpWidget(const MaterialApp(
        home: Scaffold(
            body: MaintenanceNotice(enabled: true, message: 'Back shortly'))));
    final notice = find.byType(MaintenanceNotice);
    final material = tester.widget<Material>(
        find.descendant(of: notice, matching: find.byType(Material)).first);
    final overlay = tester.widget<AnnotatedRegion<SystemUiOverlayStyle>>(find
        .descendant(
            of: notice,
            matching: find.byType(AnnotatedRegion<SystemUiOverlayStyle>))
        .first);
    expect(material.color, MaintenanceNotice.backgroundColor);
    expect(overlay.value.statusBarIconBrightness, Brightness.light);
    expect(overlay.value.statusBarBrightness, Brightness.dark);
    expect(tester.widget<Text>(find.text('Back shortly')).style?.color,
        Colors.white);
    final dark = MaintenanceNotice.backgroundColor.computeLuminance();
    expect((Colors.white.computeLuminance() + 0.05) / (dark + 0.05),
        greaterThan(7));
  });
  test('CMS maintenance settings survive an offline restart', () async {
    SharedPreferences.setMockInitialValues({
      'cms_app_text':
          '{"system":{"maintenanceMode":true,"maintenanceMessage":"Back shortly"}}'
    });
    final prefs = await SharedPreferences.getInstance();
    final copy = HeroCopyController(await ApiClient.create(), prefs);
    expect(copy.maintenanceMode, isTrue);
    expect(copy.maintenanceMessage, 'Back shortly');
    copy.dispose();
  });
}
