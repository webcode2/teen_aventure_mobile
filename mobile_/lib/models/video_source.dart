/// How a lesson video is played: YouTube stream (default) or an optional local/MP4 download.
class VideoSource {
  const VideoSource({
    required this.rawUrl,
    this.youtubeId,
    this.directFileUrl,
    this.downloadUrl = '',
  });

  final String rawUrl;
  final String? youtubeId;
  final String? directFileUrl;
  final String downloadUrl;

  bool get isYouTube => youtubeId != null && youtubeId!.length == 11;
  bool get isDirectFile => directFileUrl != null && directFileUrl!.isNotEmpty;
  bool get canStreamOnline => isYouTube || isDirectFile;

  /// YouTube may be streamed in-app. It cannot be downloaded (YouTube ToS).
  bool get canDownload {
    if (downloadUrl.trim().isNotEmpty) {
      return !parse(downloadUrl).isYouTube;
    }
    return isDirectFile && !isYouTube;
  }

  /// Official Drive thumbs should be set on [VideoLesson.thumbnailUrl].
  /// Until those files land, use YouTube's own frame for this video id.
  String? get youtubeThumbnailUrl {
    if (!isYouTube) return null;
    return 'https://img.youtube.com/vi/$youtubeId/hqdefault.jpg';
  }

  String? get urlToDownload {
    if (!canDownload) return null;
    if (downloadUrl.trim().isNotEmpty) return downloadUrl.trim();
    return directFileUrl;
  }

  static VideoSource parse(String url, {String downloadUrl = ''}) {
    final trimmed = url.trim();
    final yt = youtubeIdFromUrl(trimmed);
    final direct = _isDirectMedia(trimmed) ? trimmed : null;
    return VideoSource(
      rawUrl: trimmed,
      youtubeId: yt,
      directFileUrl: yt == null ? direct : null,
      downloadUrl: downloadUrl,
    );
  }

  static String? youtubeIdFromUrl(String url) {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return null;

    final uri = Uri.tryParse(trimmed);
    if (uri == null || uri.host.isEmpty) {
      if (RegExp(r'^[A-Za-z0-9_-]{11}$').hasMatch(trimmed)) return trimmed;
      return null;
    }

    final host = uri.host.replaceFirst(RegExp(r'^www\.'), '').toLowerCase();

    if (host == 'youtu.be') {
      final id = uri.pathSegments.isNotEmpty ? uri.pathSegments.first : '';
      return _validId(id);
    }

    if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
      final v = uri.queryParameters['v'];
      if (v != null) return _validId(v);

      final parts = uri.pathSegments;
      if (parts.length >= 2 &&
          (parts.first == 'embed' || parts.first == 'shorts' || parts.first == 'live' || parts.first == 'v')) {
        return _validId(parts[1]);
      }
    }

    return null;
  }

  static String? _validId(String id) {
    if (RegExp(r'^[A-Za-z0-9_-]{11}$').hasMatch(id)) return id;
    return null;
  }

  static bool _isDirectMedia(String url) {
    final lower = url.toLowerCase();
    if (!lower.startsWith('http://') && !lower.startsWith('https://')) return false;
    if (youtubeIdFromUrl(url) != null) return false;
    return lower.contains('.mp4') ||
        lower.contains('.m3u8') ||
        lower.contains('.webm') ||
        lower.contains('.mov');
  }
}
