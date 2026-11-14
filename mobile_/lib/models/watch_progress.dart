/// Knows when a lesson video reached its end. Fast-forwarding to the end counts.
class WatchProgress {
  /// Players can stop just short of the reported length without an end event.
  static const _endTolerance = Duration(seconds: 1);

  Duration _duration = Duration.zero;
  bool _started = false;
  bool _ended = false;

  void update(Duration position, Duration duration) {
    if (duration > Duration.zero) _duration = duration;
    if (_duration <= Duration.zero) return;
    // A reopened video can report its old end position before it rewinds to the
    // start, so the end only counts after playback was seen before the end.
    if (position < _duration - _endTolerance) {
      _started = true;
    } else if (_started) {
      _ended = true;
    }
  }

  void markEnded() {
    if (_started) _ended = true;
  }

  bool get reachedEnd => _ended;
}
