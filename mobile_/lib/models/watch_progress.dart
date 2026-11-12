/// Tracks the portions of a video that played before the player ended.
class WatchProgress {
  static const _maxPlaybackStep = Duration(milliseconds: 2500);
  static const _sampleTolerance = Duration(milliseconds: 250);
  static const _batchedPlaybackStep = Duration(milliseconds: 750);

  Duration _last = Duration.zero;
  Duration _duration = Duration.zero;
  bool _ended = false;
  final List<({Duration start, Duration end})> _played = [];

  void update(Duration position, Duration duration, {Duration? sampleInterval}) {
    if (duration > Duration.zero) _duration = duration;
    final step = position - _last;
    // With a sample interval (time spent playing since the last position move),
    // a step counts when that much playback really happened. A stalled app that
    // catches up after several seconds still counts; a seek does not, because no
    // playing time built up for it. Player callbacks can also arrive in batches,
    // so a small step is accepted even when it arrives faster than real time.
    // ponytail: short seeks within that timing window need explicit player seek events.
    final playback = sampleInterval == null
        ? step <= _maxPlaybackStep
        : (position < _duration && step <= _batchedPlaybackStep) ||
            step <= sampleInterval + _sampleTolerance;
    if (step > Duration.zero && playback) {
      if (_played.isNotEmpty && _played.last.end == _last) {
        _played.last = (start: _played.last.start, end: position);
      } else {
        _played.add((start: _last, end: position));
      }
    }
    _last = position;
    if (_duration > Duration.zero && position >= _duration) _ended = true;
  }

  void markEnded() {
    if (_duration > Duration.zero) _ended = true;
  }

  /// Stays true once the end was reached, so going back to fill a skipped part
  /// completes the lesson without playing to the end a second time.
  bool get reachedEnd => _ended;

  /// Playback actually seen, counting rewatched parts once.
  Duration get watched {
    var total = Duration.zero;
    var coveredUntil = Duration.zero;
    for (final range in _played.toList()..sort((a, b) => a.start.compareTo(b.start))) {
      final start = range.start > coveredUntil ? range.start : coveredUntil;
      if (range.end > start) total += range.end - start;
      if (range.end > coveredUntil) coveredUntil = range.end;
    }
    return total;
  }

  /// Explorers may forward through a lesson, so it counts once the end is
  /// reached and at least [requiredShare] of the video actually played.
  bool get watchedEnough {
    if (!reachedEnd || _duration <= Duration.zero) return false;
    return watched.inMilliseconds >= _duration.inMilliseconds * requiredShare;
  }

  static const requiredShare = 0.9;
}
