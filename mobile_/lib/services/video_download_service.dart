import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../platform/local_fs.dart';

/// Tracks locally saved videos. Background downloads were removed with flutter_downloader.
class VideoDownloadService {
  static const String _downloadStatusKey = 'video_download_status_';

  final SharedPreferences _prefs;

  VideoDownloadService(this._prefs, Connectivity _connectivity);

  Future<String?> downloadVideo({
    required String videoUrl,
    required String videoId,
    required String title,
    required Function(int progress, int total) onProgress,
    required Function(bool success, String? error) onComplete,
  }) async {
    onComplete(false, 'Offline download is not available in this build');
    return null;
  }

  Future<bool> isVideoDownloaded(String videoId) async {
    return _prefs.getBool('$_downloadStatusKey${videoId}_completed') ?? false;
  }

  Future<String?> getLocalVideoPath(String videoId) async {
    return _prefs.getString('$_downloadStatusKey${videoId}_local_path');
  }

  Future<VideoDownloadStatus> getDownloadStatus(String videoId) async {
    final isDownloaded = await isVideoDownloaded(videoId);
    if (isDownloaded) {
      final localPath = await getLocalVideoPath(videoId);
      return VideoDownloadStatus.completed(localPath: localPath);
    }
    return const VideoDownloadStatus.notStarted();
  }

  Future<void> cancelDownload(String videoId) async {
    final keys = _prefs
        .getKeys()
        .where((k) => k.startsWith('$_downloadStatusKey$videoId'))
        .toList();
    for (final key in keys) {
      await _prefs.remove(key);
    }
  }

  Future<void> deleteDownloadedVideo(String videoId) async {
    final localPath = await getLocalVideoPath(videoId);
    if (localPath != null) {
      await deleteLocalFile(localPath);
    }

    final keys = _prefs
        .getKeys()
        .where((k) => k.startsWith('$_downloadStatusKey$videoId'))
        .toList();
    for (final key in keys) {
      await _prefs.remove(key);
    }
  }

  Future<List<DownloadedVideo>> getAllDownloadedVideos() async {
    final keys = _prefs
        .getKeys()
        .where((k) => k.startsWith(_downloadStatusKey) && k.endsWith('_completed'))
        .toList();

    final videos = <DownloadedVideo>[];
    for (final key in keys) {
      final videoId =
          key.replaceFirst(_downloadStatusKey, '').replaceFirst('_completed', '');
      final isCompleted = _prefs.getBool(key) ?? false;
      if (isCompleted) {
        final localPath = await getLocalVideoPath(videoId);
        final title =
            _prefs.getString('$_downloadStatusKey${videoId}_title') ?? 'Unknown';
        if (localPath != null && await localFileExists(localPath)) {
          videos.add(DownloadedVideo(
            videoId: videoId,
            title: title,
            localPath: localPath,
          ));
        }
      }
    }
    return videos;
  }
}

/// Video download status
sealed class VideoDownloadStatus {
  const VideoDownloadStatus();

  const factory VideoDownloadStatus.notStarted() = _NotStarted;
  const factory VideoDownloadStatus.queued() = _Queued;
  const factory VideoDownloadStatus.downloading({required int progress}) = _Downloading;
  const factory VideoDownloadStatus.paused({required int progress}) = _Paused;
  const factory VideoDownloadStatus.completed({required String? localPath}) = _Completed;
  const factory VideoDownloadStatus.failed({required String error}) = _Failed;
  const factory VideoDownloadStatus.cancelled() = _Cancelled;

  bool get isDownloaded => this is _Completed;
  bool get isDownloading => this is _Downloading;

  String get displayText {
    return switch (this) {
      _NotStarted() => 'Not Downloaded',
      _Queued() => 'Queued',
      _Downloading(progress: final p) => 'Downloading $p%',
      _Paused(progress: final p) => 'Paused at $p%',
      _Completed(localPath: _) => 'Downloaded',
      _Failed(error: final e) => 'Failed: $e',
      _Cancelled() => 'Cancelled',
    };
  }
}

class _NotStarted extends VideoDownloadStatus {
  const _NotStarted();
}

class _Queued extends VideoDownloadStatus {
  const _Queued();
}

class _Downloading extends VideoDownloadStatus {
  final int progress;
  const _Downloading({required this.progress});
}

class _Paused extends VideoDownloadStatus {
  final int progress;
  const _Paused({required this.progress});
}

class _Completed extends VideoDownloadStatus {
  final String? localPath;
  const _Completed({required this.localPath});
}

class _Failed extends VideoDownloadStatus {
  final String error;
  const _Failed({required this.error});
}

class _Cancelled extends VideoDownloadStatus {
  const _Cancelled();
}

/// Downloaded video model
class DownloadedVideo {
  final String videoId;
  final String title;
  final String localPath;

  const DownloadedVideo({
    required this.videoId,
    required this.title,
    required this.localPath,
  });
}
