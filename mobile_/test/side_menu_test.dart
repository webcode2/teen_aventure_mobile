import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/screens/home/widgets/side_menu.dart';

void main() {
  Widget menu({required VoidCallback onProfile, String name = 'Grace'}) {
    return MaterialApp(
      home: Scaffold(
        body: Align(
          alignment: Alignment.centerLeft,
          child: SizedBox(
            width: 300,
            child: Column(
              children: [
                SideMenuProfileHeader(
                  name: name,
                  accountKind: 'Explorer',
                  onTap: onProfile,
                ),
                const SideMenuSectionLabel('Explore'),
                SideMenuItem(
                  icon: Icons.home_rounded,
                  color: Colors.indigo,
                  label: 'Home',
                  selected: true,
                  onTap: () {},
                ),
                SideMenuItem(
                  icon: Icons.notifications_rounded,
                  color: Colors.orange,
                  label: 'Notifications',
                  badge: 120,
                  onTap: () {},
                ),
                SideMenuItem(
                  icon: Icons.switch_account_rounded,
                  color: Colors.teal,
                  label: 'Switch account',
                  subtitle: 'Back to parent / change profile',
                  onTap: () {},
                ),
                Row(
                  children: [
                    Expanded(
                      child: SideMenuFooterLink(
                        icon: Icons.flag_outlined,
                        label: 'Report an issue',
                        onTap: () {},
                      ),
                    ),
                    Expanded(
                      child: SideMenuFooterLink(
                        icon: Icons.description_outlined,
                        label: 'Terms',
                        onTap: () {},
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

  testWidgets('header shows the person\'s initial and opens the profile',
      (tester) async {
    var opened = 0;
    await tester.pumpWidget(menu(onProfile: () => opened++));

    expect(find.text('G'), findsOneWidget);
    expect(find.text('Grace'), findsOneWidget);
    expect(find.text('Explorer'), findsOneWidget);
    expect(find.text('99+'), findsOneWidget);

    await tester.tap(find.byKey(const Key('drawer-profile')));
    expect(opened, 1);
  });

  testWidgets('an empty account type shows no blank tag', (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SizedBox(
          width: 300,
          child:
              SideMenuProfileHeader(name: 'Ada', accountKind: '', onTap: () {}),
        ),
      ),
    ));
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('View profile'), findsOneWidget);
    expect(
        find.byType(Container).evaluate().where((e) {
          final box = (e.widget as Container).decoration;
          return box is BoxDecoration &&
              box.borderRadius == BorderRadius.circular(999);
        }),
        isEmpty);
  });

  testWidgets('long names fit the 300px menu without overflow', (tester) async {
    await tester.pumpWidget(menu(
      onProfile: () {},
      name: 'Bartholomew Oluwaseun Montgomery-Adeyemi the Third',
    ));
    expect(tester.takeException(), isNull);
  });
}
