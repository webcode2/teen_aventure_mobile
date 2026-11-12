import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/watch_progress.dart';

Duration s(num seconds) => Duration(milliseconds: (seconds * 1000).round());

/// Plays from [from] to [to] in one-second ticks of real playback.
void play(WatchProgress watch, double from, double to, double total) {
  for (var t = from + 1; t <= to; t += 1) {
    watch.update(s(t), s(total), sampleInterval: s(1));
  }
}

void main() {
  test('a video played through to the end counts', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 60; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.reachedEnd, isTrue);
    expect(watch.watchedEnough, isTrue);
  });

  test('nearly finished does not count until the end is reached', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 57; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.reachedEnd, isFalse);
    expect(watch.watchedEnough, isFalse);
  });

  test('forwarding past a short part still counts', () {
    // 6 of 60 seconds skipped: 90% watched.
    final watch = WatchProgress();
    watch.update(Duration.zero, s(60), sampleInterval: Duration.zero);
    play(watch, 0, 30, 60);
    watch.update(s(36), s(60), sampleInterval: Duration.zero);
    play(watch, 36, 60, 60);
    watch.markEnded();
    expect(watch.watched, s(54));
    expect(watch.watchedEnough, isTrue);
  });

  test('forwarding past more than a tenth does not count', () {
    final watch = WatchProgress();
    watch.update(Duration.zero, s(60), sampleInterval: Duration.zero);
    play(watch, 0, 30, 60);
    watch.update(s(40), s(60), sampleInterval: Duration.zero);
    play(watch, 40, 60, 60);
    watch.markEnded();
    expect(watch.watchedEnough, isFalse);
  });

  test('forwarding straight to the end does not count', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 5; t += 0.5) {
      watch.update(s(t), s(60));
    }
    watch.update(s(59.5), s(60));
    watch.update(s(60), s(60));
    expect(watch.reachedEnd, isTrue);
    expect(watch.watchedEnough, isFalse);
  });

  test('a short forward seek does not count as playback when samples arrive quickly', () {
    final watch = WatchProgress();
    watch.update(s(0.5), s(3), sampleInterval: s(0.5));
    watch.update(s(2), s(3), sampleInterval: s(0.1));
    watch.update(s(3), s(3), sampleInterval: s(1));
    expect(watch.watched, s(1.5));
    expect(watch.watchedEnough, isFalse);
  });

  test('an end event right after normal playback counts', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 59; t += 0.5) {
      watch.update(s(t), s(60));
    }
    watch.markEnded();
    expect(watch.watchedEnough, isTrue);
  });

  test('batched playback callbacks still count', () {
    final watch = WatchProgress();
    for (var t = 0.0; t < 8; t += 0.5) {
      watch.update(s(t), s(8), sampleInterval: s(0.1));
    }
    watch.markEnded();
    expect(watch.watchedEnough, isTrue);
  });

  test('an app freeze during real playback still counts', () {
    // Playback kept going while the app stalled, so the playing time since the
    // last position move matches the jump when the app catches up.
    final watch = WatchProgress();
    var t = 0.0;
    watch.update(s(t), s(60), sampleInterval: Duration.zero);
    while (t < 60) {
      final step = t == 20 ? 3.0 : (t == 40 ? 10.0 : 1.0);
      t = (t + step).clamp(0, 60).toDouble();
      watch.update(s(t), s(60), sampleInterval: s(step));
    }
    watch.markEnded();
    expect(watch.watched, s(60));
    expect(watch.watchedEnough, isTrue);
  });

  test('pausing, waiting and then forwarding is not counted as watched time', () {
    // Paused time never adds to the playing time, so the jump has none behind it.
    final watch = WatchProgress();
    watch.update(Duration.zero, s(60), sampleInterval: Duration.zero);
    play(watch, 0, 20, 60);
    watch.update(s(40), s(60), sampleInterval: Duration.zero);
    play(watch, 40, 60, 60);
    watch.markEnded();
    expect(watch.watched, s(40));
    expect(watch.watchedEnough, isFalse);
  });

  test('rewatching a part counts it once', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 30; t += 0.5) {
      watch.update(s(t), s(60));
    }
    for (var t = 20.0; t <= 60; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.watched, s(60));
    expect(watch.watchedEnough, isTrue);
  });

  test('going back over a skipped part makes it count', () {
    final watch = WatchProgress();
    watch.update(Duration.zero, s(60), sampleInterval: Duration.zero);
    play(watch, 0, 10, 60);
    watch.update(s(40), s(60), sampleInterval: Duration.zero);
    play(watch, 40, 60, 60);
    watch.markEnded();
    expect(watch.watchedEnough, isFalse);
    watch.update(s(10), s(60), sampleInterval: Duration.zero);
    play(watch, 10, 40, 60);
    expect(watch.watchedEnough, isTrue, reason: 'the end was already reached');
  });
}
