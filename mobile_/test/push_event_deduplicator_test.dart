import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/services/push_event_deduplicator.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('concurrent duplicate deliveries emit once while taps remain separate', () async {
    final deduplicator = PushEventDeduplicator();
    final deliveries = await Future.wait(List.generate(5, (_) => deduplicator.accept('event', opened: false)));
    expect(deliveries.where((accepted) => accepted).length, 1);
    expect(await deduplicator.accept('event', opened: true), isTrue);
    expect(await deduplicator.accept('event', opened: true), isFalse);
    expect(await PushEventDeduplicator().accept('event', opened: false), isFalse);
  });

  test('history stays bounded and notices without an ID still work', () async {
    final deduplicator = PushEventDeduplicator();
    for (var index = 0; index < 205; index++) {
      expect(await deduplicator.accept('event-$index', opened: false), isTrue);
    }
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getStringList('push.received.events.v1')!.length, 200);
    expect(await deduplicator.accept('event-204', opened: false), isFalse);
    expect(await deduplicator.accept(null, opened: false), isTrue);
  });
}
