import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/providers/hero_copy.dart';
import 'package:teen_aventure/screens/teen/widgets/home_announcement_banner.dart';

void main() {
  testWidgets('hides the banner when the admin turns it off', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HomeAnnouncementBanner(
            announcement: HomeAnnouncement(
              enabled: false,
              badge: 'NEW',
              text: 'Welcome to Teen Bible Adventures! Week 1 is now live.',
              actionLabel: 'Explore Week 1',
            ),
          ),
        ),
      ),
    );
    expect(find.text('NEW'), findsNothing);
    expect(find.text('Explore Week 1'), findsNothing);
  });

  testWidgets('slides a long sentence and keeps a short one still', (tester) async {
    const longLine = 'Welcome to Teen Bible Adventures! Week 1 is now live.';
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: SizedBox(
            width: 280,
            child: HomeAnnouncementBanner(
              announcement: HomeAnnouncement(
                enabled: true,
                badge: 'NEW',
                text: longLine,
                actionLabel: 'Explore Week 1',
              ),
            ),
          ),
        ),
      ),
    );
    expect(find.text('NEW'), findsOneWidget);
    expect(find.text('Explore Week 1'), findsOneWidget);
    expect(find.text(longLine), findsWidgets);
    await tester.pump(const Duration(milliseconds: 400));
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: HomeAnnouncementBanner(
            announcement: HomeAnnouncement(
              enabled: true,
              badge: 'NEW',
              text: 'Hi',
              actionLabel: 'Go',
            ),
          ),
        ),
      ),
    );
    expect(find.text('Hi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
