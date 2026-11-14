import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/watch_progress.dart';

Duration s(num seconds) => Duration(milliseconds: (seconds * 1000).round());

void main() {
  test('a video played through to the end counts', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 60; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.reachedEnd, isTrue);
  });

  test('fast-forwarding to the end counts', () {
    final watch = WatchProgress();
    watch.update(s(2), s(1789));
    watch.update(s(1789), s(1789));
    expect(watch.reachedEnd, isTrue);
  });

  test('stopping before the end does not count', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 50; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.reachedEnd, isFalse);
  });

  test('the player stopping just short of the end still counts', () {
    final watch = WatchProgress();
    watch.update(s(10), s(60));
    watch.update(s(59.4), s(60));
    expect(watch.reachedEnd, isTrue);
  });

  test('an end event after playback counts', () {
    final watch = WatchProgress();
    watch.update(s(30), s(60));
    watch.markEnded();
    expect(watch.reachedEnd, isTrue);
  });

  test('a reopened video reporting its old end position does not count', () {
    final watch = WatchProgress();
    watch.update(s(60), s(60));
    watch.markEnded();
    expect(watch.reachedEnd, isFalse);
    watch.update(s(0.1), s(60));
    expect(watch.reachedEnd, isFalse, reason: 'rewound to the start, not finished');
  });

  test('nothing counts before the length is known', () {
    final watch = WatchProgress();
    watch.update(s(5), Duration.zero);
    watch.markEnded();
    expect(watch.reachedEnd, isFalse);
  });
}
