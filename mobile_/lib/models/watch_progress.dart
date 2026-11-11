/// Tracks the portions of a video that played before the player ended.
class WatchProgress {
  static const _maxPlaybackStep = Duration(milliseconds: 2500);
  static const _sampleTolerance = Duration(milliseconds: 250);

  Duration _last = Duration.zero;
  Duration _duration = Duration.zero;
  bool _ended = false;
  final List<({Duration start, Duration end})> _played = [];

  void update(Duration position, Duration duration, {Duration? sampleInterval}) {
    if (duration > Duration.zero) _duration = duration;
    final step = position - _last;
    // ponytail: position samples can miss seeks within player timing jitter.
    // Use explicit seek events if the player exposes them.
    if (step > Duration.zero &&
        step <= _maxPlaybackStep &&
        (sampleInterval == null || step <= sampleInterval + _sampleTolerance)) {
      if (_played.isNotEmpty && _played.last.end == _last) {
        _played.last = (start: _played.last.start, end: position);
      } else {
        _played.add((start: _last, end: position));
      }
    }
    if (position < _duration) _ended = false;
    _last = position;
  }

  void markEnded({Duration? sampleInterval}) {
    if (_duration <= Duration.zero) return;
    update(_duration, _duration, sampleInterval: sampleInterval);
    _ended = true;
  }

  bool get reachedEnd => _ended || (_duration > Duration.zero && _last >= _duration);

  bool get fullyWatched {
    if (!reachedEnd) return false;
    var coveredUntil = Duration.zero;
    for (final range in _played.toList()..sort((a, b) => a.start.compareTo(b.start))) {
      if (range.start > coveredUntil) return false;
      if (range.end > coveredUntil) coveredUntil = range.end;
      if (coveredUntil >= _duration) return true;
    }
    return false;
  }
}
