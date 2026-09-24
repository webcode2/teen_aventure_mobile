import 'video_lesson.dart';

/// Sequential unlock for a week's three lesson videos.
class WeekVideoProgress {
  static const int slotCount = 3;

  const WeekVideoProgress({
    required this.videos,
    required this.completedCount,
  });

  final List<VideoLesson> videos;
  final int completedCount;

  int get videoCount => videos.length;

  int get completed => completedCount.clamp(0, videoCount);

  /// Index of the video the explorer should watch next.
  int get currentIndex {
    if (videoCount == 0) return 0;
    if (completed >= videoCount) return videoCount - 1;
    return completed;
  }

  bool get weekComplete => videoCount > 0 && completed >= videoCount;

  bool isComplete(int index) => index < completed;

  bool isCurrent(int index) => !weekComplete && index == currentIndex;

  bool isLocked(int index) => index >= videoCount || index > completed;

  bool canOpen(int index) => index < videoCount && index <= completed;

  VideoLesson? lessonAt(int index) {
    if (index < 0 || index >= videos.length) return null;
    return videos[index];
  }

  static int sequentialCompleted({
    required List<VideoLesson> videos,
    required bool Function(VideoLesson video) isWatched,
    int sessionCompleted = 0,
  }) {
    var fromWatched = 0;
    for (final video in videos) {
      if (!isWatched(video)) break;
      fromWatched += 1;
    }
    final session = sessionCompleted.clamp(0, videos.length);
    return fromWatched > session ? fromWatched : session;
  }
}
