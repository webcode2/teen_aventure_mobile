import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';

/// Receive and open use separate histories: receiving a notice must not consume its tap.
class PushEventDeduplicator {
  Future<void> _pending = Future<void>.value();

  Future<bool> accept(String? eventId, {required bool opened}) {
    if (eventId == null || eventId.isEmpty) return Future<bool>.value(true);
    final result = Completer<bool>();
    _pending = _pending.then((_) async {
      try {
        final preferences = await SharedPreferences.getInstance();
        final key = opened ? 'push.opened.events.v1' : 'push.received.events.v1';
        final history = preferences.getStringList(key) ?? <String>[];
        if (history.contains(eventId)) {
          result.complete(false);
          return;
        }
        history.add(eventId);
        if (history.length > 200) history.removeRange(0, history.length - 200);
        await preferences.setStringList(key, history);
        result.complete(true);
      } catch (_) {
        // Do not discard a legitimate notice because local preference storage failed.
        result.complete(true);
      }
    });
    return result.future;
  }
}
