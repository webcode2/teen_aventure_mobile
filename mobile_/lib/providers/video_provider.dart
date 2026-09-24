import 'package:flutter/material.dart';
import '../config/store_config.dart';
import '../services/content_service.dart';
import '../services/video_download_service.dart';
import '../models/api_models.dart';
import '../models/video_lesson.dart';

/// Provider for Teen Quest content from the backend.
class VideoProvider extends ChangeNotifier {
  final ContentService _contentService;
  final VideoDownloadService _videoDownloadService;

  VideoProvider(this._contentService, this._videoDownloadService);

  List<TeenQuest> _teenQuests = [];
  bool _isLoading = false;
  String? _error;

  List<TeenQuest> get teenQuests => _teenQuests;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// Summary cards for week pickers (one card per quest week).
  List<VideoLesson> get questWeekLessons {
    return _teenQuests
        .map((q) {
          final first = q.videos.isNotEmpty ? q.videos.first : null;
          return VideoLesson(
            id: q.id,
            weekNumber: q.weekNumber,
            title: q.title,
            subtitle: q.scripture,
            duration: first?.duration ?? '05:00',
            speaker: first?.speaker ?? 'Abi & Zach',
            thumbnailEmoji: first?.thumbnailEmoji ?? '🎬',
            thumbnailUrl: first?.thumbnailUrl ?? '',
            keyVerse: q.scripture,
            keyVerseText: q.content,
            takeaways: const [],
            timestamps: const [],
            quizQuestions: q.objectiveQuiz.map((item) => item.toQuizQuestion()).toList(),
            videoUrl: first?.videoUrl ?? '',
          );
        })
        .toList();
  }

  Future<void> loadContent() async {
    if (!StoreConfig.hasRemoteApi) {
      _isLoading = false;
      _error = null;
      notifyListeners();
      return;
    }
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _teenQuests = await _contentService.getTeenQuestWeeks();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  TeenQuest? getTeenQuest(int weekNumber) {
    try {
      return _teenQuests.firstWhere((q) => q.weekNumber == weekNumber);
    } catch (_) {
      return null;
    }
  }

  Future<bool> isVideoDownloaded(String videoId) async {
    return await _videoDownloadService.isVideoDownloaded(videoId);
  }

  Future<String?> getLocalVideoPath(String videoId) async {
    return await _videoDownloadService.getLocalVideoPath(videoId);
  }

  Future<void> downloadVideo({
    required String videoId,
    required String videoUrl,
    required String title,
    required Function(int progress, int total) onProgress,
    required Function(bool success, String? error) onComplete,
  }) async {
    await _videoDownloadService.downloadVideo(
      videoUrl: videoUrl,
      videoId: videoId,
      title: title,
      onProgress: onProgress,
      onComplete: onComplete,
    );
    notifyListeners();
  }

  Future<VideoDownloadStatus> getDownloadStatus(String videoId) async {
    return await _videoDownloadService.getDownloadStatus(videoId);
  }

  Future<void> cancelDownload(String videoId) async {
    await _videoDownloadService.cancelDownload(videoId);
    notifyListeners();
  }

  Future<void> deleteDownloadedVideo(String videoId) async {
    await _videoDownloadService.deleteDownloadedVideo(videoId);
    notifyListeners();
  }

  Future<List<DownloadedVideo>> getAllDownloadedVideos() async {
    return await _videoDownloadService.getAllDownloadedVideos();
  }
}
