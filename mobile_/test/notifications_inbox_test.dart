import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/services/engagement_service.dart';
import 'package:teen_aventure/services/push_hooks.dart';

void main() {
  test('a tap that launches the app is kept until the home screen asks for it', () async {
    PushHooks.emitOpened(PushNotice.fromParts(title: 'Cheer', data: {'type': 'nudge'}));
    final pending = PushHooks.takePendingOpen();
    expect(pending?.type, 'nudge');
    expect(PushHooks.takePendingOpen(), isNull);
  });

  test('parses image and action fields from the push data payload', () {
    final notice = PushNotice.fromParts(
      title: 'Quest',
      body: 'Ready',
      data: {
        'type': 'account',
        'imageUrl': 'https://cdn.example.com/q.png',
        'actionLabel': 'Open',
        'actionUrl': 'https://example.com/q',
      },
    );
    expect(notice.imageUrl, 'https://cdn.example.com/q.png');
    expect(notice.actionLabel, 'Open');
    expect(notice.actionUrl, 'https://example.com/q');
    expect(notice.hasActionUrl, isTrue);
  });

  test('taps go straight to a listening screen', () async {
    final seen = <String?>[];
    final sub = PushHooks.opened.listen((n) => seen.add(n.type));
    PushHooks.emitOpened(const PushNotice(type: 'class_message'));
    await Future<void>.delayed(Duration.zero);
    expect(seen, ['class_message']);
    expect(PushHooks.takePendingOpen(), isNull);
    await sub.cancel();
  });

  test('class inbox messages parse and mark read', () {
    final message = ClassInboxMessage.fromJson({
      'id': 'm1',
      'classId': 'c1',
      'className': 'Youth A',
      'fromName': 'Tom',
      'body': 'Bring your Bible Sunday',
      'createdAt': '2026-09-29T10:00:00.000Z',
      'unread': true,
    });
    expect(message.unread, isTrue);
    expect(message.className, 'Youth A');
    expect(message.markedRead().unread, isFalse);
    expect(message.markedRead().body, 'Bring your Bible Sunday');
  });
}
