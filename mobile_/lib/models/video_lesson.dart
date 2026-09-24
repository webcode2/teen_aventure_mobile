import 'puzzle.dart';
import 'video_source.dart';

class VideoLesson {
  final String id;
  final int weekNumber;
  final int partNumber; // Part 1, Part 2, Part 3 (sequential video parts)
  final String title;
  final String subtitle;
  final String duration;
  final String speaker;
  final String thumbnailEmoji;
  /// Official TBA thumb (asset path or https). Empty until Drive files are dropped in.
  final String thumbnailUrl;
  final String keyVerse;
  final String keyVerseText;
  final String bibleVersion;
  final List<String> takeaways;
  final List<VideoTimestamp> timestamps;
  final List<QuizQuestion> quizQuestions;
  /// YouTube watch/embed/short URL (preferred) or a direct MP4 stream.
  final String videoUrl;
  /// Optional MP4 for offline download. YouTube URLs cannot be saved in-app.
  final String downloadUrl;

  const VideoLesson({
    required this.id,
    required this.weekNumber,
    this.partNumber = 1,
    required this.title,
    required this.subtitle,
    required this.duration,
    required this.speaker,
    required this.thumbnailEmoji,
    this.thumbnailUrl = '',
    required this.keyVerse,
    required this.keyVerseText,
    this.bibleVersion = 'NIV',
    required this.takeaways,
    required this.timestamps,
    required this.quizQuestions,
    this.videoUrl = '',
    this.downloadUrl = '',
  });

  /// Drive/asset thumb first; otherwise the YouTube frame for this same video.
  String? get resolvedThumbnail {
    final explicit = thumbnailUrl.trim();
    if (explicit.isNotEmpty) return explicit;
    return VideoSource.parse(videoUrl).youtubeThumbnailUrl;
  }

  factory VideoLesson.fromJson(Map<String, dynamic> json, {int weekNumber = 0}) {
    return VideoLesson(
      id: json['id'] as String? ?? '',
      weekNumber: json['weekNumber'] as int? ?? weekNumber,
      partNumber: json['partNumber'] as int? ?? 1,
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String? ?? '',
      duration: json['duration'] as String? ?? '',
      speaker: json['speaker'] as String? ?? 'Abi & Zach',
      thumbnailEmoji: json['thumbnailEmoji'] as String? ?? '🎬',
      thumbnailUrl: json['thumbnailUrl'] as String? ?? '',
      keyVerse: json['keyVerse'] as String? ?? '',
      keyVerseText: json['keyVerseText'] as String? ?? '',
      bibleVersion: json['bibleVersion'] as String? ?? 'NIV',
      takeaways: const [],
      timestamps: const [],
      quizQuestions: const [],
      videoUrl: json['videoUrl'] as String? ?? '',
      downloadUrl: json['downloadUrl'] as String? ?? '',
    );
  }
}

class VideoTimestamp {
  final String time;
  final String label;

  const VideoTimestamp({required this.time, required this.label});
}

class WeekLearningPackage {
  final int weekNumber;
  final String title;
  final String subtitle;
  final List<VideoLesson> videos; // Up to 3 sequential videos per week
  final PuzzleEpisode puzzleEpisode;
  final List<QuizQuestion> quizQuestions;

  const WeekLearningPackage({
    required this.weekNumber,
    required this.title,
    required this.subtitle,
    required this.videos,
    required this.puzzleEpisode,
    required this.quizQuestions,
  });
}
