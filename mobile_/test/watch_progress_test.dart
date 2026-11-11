import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/watch_progress.dart';

Duration s(num seconds) => Duration(milliseconds: (seconds * 1000).round());

void main() {
  test('a video played through to the end counts as watched', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 60; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.reachedEnd, isTrue);
    expect(watch.fullyWatched, isTrue);
  });

  test('nearly finished is not finished', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 50; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.reachedEnd, isFalse);
    expect(watch.fullyWatched, isFalse);
  });

  test('skipping to the end does not count as watching', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 5; t += 0.5) {
      watch.update(s(t), s(60));
    }
    watch.update(s(59.5), s(60));
    watch.update(s(60), s(60));
    expect(watch.reachedEnd, isTrue);
    expect(watch.fullyWatched, isFalse);
  });

  test('skipping a section after watching most of the video does not count',
      () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 55; t += 0.5) {
      watch.update(s(t), s(60));
    }
    watch.update(s(60), s(60));
    expect(watch.fullyWatched, isFalse);
  });

  test('a short forward seek leaves a gap when playback samples arrive quickly', () {
    final watch = WatchProgress();
    watch.update(s(0.5), s(3), sampleInterval: s(0.5));
    watch.update(s(2), s(3), sampleInterval: s(0.1));
    watch.update(s(3), s(3), sampleInterval: s(1));
    expect(watch.fullyWatched, isFalse);
  });

  test('an end event right after normal playback completes the video', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 59; t += 0.5) {
      watch.update(s(t), s(60));
    }
    watch.markEnded();
    expect(watch.fullyWatched, isTrue);
  });

  test('rewinding and rewatching still counts the whole video', () {
    final watch = WatchProgress();
    for (var t = 0.0; t <= 30; t += 0.5) {
      watch.update(s(t), s(60));
    }
    for (var t = 20.0; t <= 60; t += 0.5) {
      watch.update(s(t), s(60));
    }
    expect(watch.fullyWatched, isTrue);
  });
}
