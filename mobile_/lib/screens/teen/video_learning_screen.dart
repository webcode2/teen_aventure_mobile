import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/video_lesson.dart';
import '../../models/game_controller.dart';
import '../../models/video_source.dart';
import '../../models/watch_progress.dart';
import '../../platform/local_fs.dart';
import '../../providers/current_quest_provider.dart';
import '../../providers/video_provider.dart';
import '../../theme.dart';
import '../../config/store_config.dart';
import 'widgets/lesson_video_player.dart';
import '../shared/offline_videos_screen.dart';
import '../../services/video_download_service.dart';

class VideoLearningScreen extends StatefulWidget {
  final VideoLesson lesson;
  final int? videoIndex;
  final String? weekLabel;
  final String? lessonTitle;

  const VideoLearningScreen({
    super.key,
    required this.lesson,
    this.videoIndex,
    this.weekLabel,
    this.lessonTitle,
  });

  @override
  State<VideoLearningScreen> createState() => _VideoLearningScreenState();
}

class _VideoLearningScreenState extends State<VideoLearningScreen> {
  bool isFullScreen = false;
  bool _lessonMarked = false;
  bool _continuing = false;
  final WatchProgress _watch = WatchProgress();
  final _watchClock = Stopwatch()..start();
  Duration _lastTickAt = Duration.zero;
  bool _lastTickPlaying = false;
  // Time spent playing since the position last moved; paused time never counts.
  Duration _playedSinceMove = Duration.zero;
  Duration _lastWatchPosition = Duration.zero;
  bool _skipNoticeShown = false;

  double progressSeconds = 0;
  // Download state
  VideoDownloadStatus? _downloadStatus;
  bool _isDownloading = false;
  int _downloadProgress = 0;
  String? _localPath;
  bool _preferLocal = false;
  double totalSeconds = 0;

  VideoSource get _source => VideoSource.parse(
        widget.lesson.videoUrl,
        downloadUrl: widget.lesson.downloadUrl,
      );

  @override
  void initState() {
    super.initState();
    _checkDownloadStatus();
    _loadPlaybackSource();
  }

  @override
  void dispose() {
    _restoreDeviceOrientation();
    super.dispose();
  }

  Future<void> _setFullScreen(bool enabled) async {
    if (!mounted) return;
    final alreadyLandscape =
        MediaQuery.orientationOf(context) == Orientation.landscape;
    setState(() => isFullScreen = enabled);
    if (enabled) {
      if (!alreadyLandscape) {
        await SystemChrome.setPreferredOrientations(const [
          DeviceOrientation.landscapeLeft,
          DeviceOrientation.landscapeRight,
        ]);
      }
      await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    } else {
      await _restoreDeviceOrientation();
    }
  }

  Future<void> _restoreDeviceOrientation() async {
    await SystemChrome.setPreferredOrientations(const [
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
    ]);
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setSystemUIOverlayStyle(TeenAppTheme.lightStatusBar);
  }

  Future<void> _leaveVideoPlayback() async {
    if (isFullScreen) {
      await _setFullScreen(false);
    } else {
      await _restoreDeviceOrientation();
    }
  }

  void _onVideoProgress() {
    if (_continuing || !_watch.reachedEnd) return;
    if (_watch.watchedEnough) {
      _finishAndContinue();
    } else {
      _showSkipNotice();
    }
  }

  /// Reaching the end after skipping most of the video does not complete the lesson.
  void _showSkipNotice() {
    if (_skipNoticeShown || !mounted) return;
    _skipNoticeShown = true;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Watch most of the video to complete this lesson. Go back to the parts you skipped.'),
      ),
    );
  }

  Future<void> _markLessonWatched() async {
    if (_lessonMarked) return;
    setState(() => _lessonMarked = true);
    final index = widget.videoIndex ?? widget.lesson.partNumber - 1;
    try {
      context.read<GameController>().completeVideoPart(index);
    } catch (_) {}
    try {
      await context.read<CurrentQuestProvider>().recordVideoWatched(
        videoId: widget.lesson.id,
        weekNumber: widget.lesson.weekNumber,
      );
    } catch (_) {}
  }

  Future<void> _finishAndContinue() async {
    if (_continuing || !_watch.watchedEnough) return;
    _continuing = true;
    await Future.wait([_markLessonWatched(), _leaveVideoPlayback()]);
    if (mounted && ModalRoute.of(context)?.isCurrent == true && Navigator.canPop(context)) {
      Navigator.pop(context);
    }
  }

  Future<void> _loadPlaybackSource() async {
    final connectivity = await Connectivity().checkConnectivity();
    final offline = connectivity == ConnectivityResult.none;
    if (!mounted) return;
    final path = await context.read<VideoProvider>().getLocalVideoPath(widget.lesson.id);
    final hasFile = path != null && await localFileExists(path);
    if (!mounted) return;
    setState(() {
      _localPath = hasFile ? path : null;
      _preferLocal = offline && hasFile;
    });
  }

  Future<void> _checkDownloadStatus() async {
    final provider = context.read<VideoProvider>();
    final status = await provider.getDownloadStatus(widget.lesson.id);
    if (mounted) {
      setState(() {
        _downloadStatus = status;
      });
    }
  }

  Future<void> _downloadVideo() async {
    if (_isDownloading) return;

    final provider = context.read<VideoProvider>();
    if (!_source.canDownload) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'This lesson streams from YouTube. Offline save needs a separate downloadable file.',
            ),
            backgroundColor: AppColors.navy,
          ),
        );
      }
      return;
    }

    final videoUrl = _source.urlToDownload!;

    setState(() {
      _isDownloading = true;
      _downloadProgress = 0;
    });

    await provider.downloadVideo(
      videoId: widget.lesson.id,
      videoUrl: videoUrl,
      title: widget.lesson.title,
      onProgress: (progress, total) {
        if (mounted) {
          setState(() {
            _downloadProgress = progress;
          });
        }
      },
      onComplete: (success, error) async {
        if (mounted) {
          setState(() {
            _isDownloading = false;
          });
          if (success) {
            await _checkDownloadStatus();
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('${widget.lesson.title} downloaded for offline viewing!'),
                backgroundColor: AppColors.forestGreen,
                action: SnackBarAction(
                  label: 'VIEW OFFLINE',
                  textColor: AppColors.gold,
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const OfflineVideosScreen()),
                    );
                  },
                ),
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Download failed: ${error ?? 'Unknown error'}'),
                backgroundColor: Colors.red,
              ),
            );
          }
        }
      },
    );
  }

  Future<void> _deleteDownloadedVideo() async {
    final provider = context.read<VideoProvider>();
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Download'),
        content: Text('Remove "${widget.lesson.title}" from offline videos?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm == true && mounted) {
      await provider.deleteDownloadedVideo(widget.lesson.id);
      await _checkDownloadStatus();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${widget.lesson.title} removed from offline videos')),
        );
      }
    }
  }

  Widget _buildDownloadButton() {
    final isDownloaded = _downloadStatus?.isDownloaded ?? false;
    final isDownloading = _downloadStatus?.isDownloading ?? false;

    if (isDownloaded) {
      return IconButton(
        icon: const Icon(Icons.download_done, color: AppColors.forestGreen, size: 22),
        tooltip: 'Downloaded - Tap to remove',
        onPressed: _deleteDownloadedVideo,
      );
    } else if (isDownloading || _isDownloading) {
      return Stack(
        alignment: Alignment.center,
        children: [
          SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              value: _downloadProgress / 100,
              strokeWidth: 2,
              color: AppColors.gold,
              backgroundColor: Colors.white24,
            ),
          ),
          Text(
            '$_downloadProgress%',
            style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
          ),
        ],
      );
    } else {
      return IconButton(
        icon: const Icon(Icons.download_for_offline, color: Colors.white, size: 22),
        tooltip: 'Download for offline viewing',
        onPressed: _downloadVideo,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lesson = widget.lesson;
    final weekLabel = widget.weekLabel ?? 'Week ${lesson.weekNumber} Quest';
    final lessonTitle = widget.lessonTitle ?? lesson.title;
    var videoPoints = 0;
    try {
      videoPoints = context.watch<CurrentQuestProvider>().current?.videoPoints ?? 0;
    } catch (_) {}
    final pointsLabel = videoPoints > 0 ? '+$videoPoints PTS' : null;

    return PopScope(
      canPop: !isFullScreen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && isFullScreen) {
          _setFullScreen(false);
        }
      },
      child: Scaffold(
      backgroundColor: AppColors.cream,
      appBar: isFullScreen
          ? null
          : AppBar(
              backgroundColor: AppColors.navy,
              foregroundColor: AppColors.cream,
              elevation: 0,
              leading: IconButton(
                icon: const Icon(Icons.arrow_back, color: AppColors.cream),
                onPressed: () async {
                  if (_lessonMarked) {
                    await _finishAndContinue();
                  } else {
                    Navigator.pop(context);
                  }
                },
              ),
              title: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    weekLabel,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      color: AppColors.gold,
                      letterSpacing: 0.2,
                    ),
                  ),
                  Text(
                    lessonTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: AppColors.cream,
                    ),
                  ),
                ],
              ),
              actions: [
                if (pointsLabel != null)
                  Container(
                    margin: const EdgeInsets.only(right: 16),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.gold, width: 1),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          _lessonMarked ? Icons.check_circle : Icons.stars_rounded,
                          size: 14,
                          color: AppColors.gold,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _lessonMarked ? 'Saving progress…' : pointsLabel,
                          style: const TextStyle(
                            color: AppColors.gold,
                            fontWeight: FontWeight.w900,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
      body: SafeArea(
        top: !isFullScreen,
        bottom: !isFullScreen,
        left: !isFullScreen,
        right: !isFullScreen,
        child: Column(
          children: [
            // Video Player Container (Expands in Fullscreen mode)
            Expanded(
              flex: isFullScreen ? 1 : 0,
              child: Container(
                width: double.infinity,
                height: isFullScreen ? null : MediaQuery.sizeOf(context).width * 9 / 16,
                clipBehavior: Clip.hardEdge,
                decoration: const BoxDecoration(color: AppColors.navy),
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: LessonVideoPlayer(
                        lesson: widget.lesson,
                        localFilePath: _localPath,
                        useLocalFile: _preferLocal,
                        onPosition: (position, duration, playing) {
                          final now = _watchClock.elapsed;
                          if (_lastTickPlaying) _playedSinceMove += now - _lastTickAt;
                          _lastTickAt = now;
                          _lastTickPlaying = playing;
                          _watch.update(
                            position,
                            duration,
                            sampleInterval: _playedSinceMove,
                          );
                          if (position != _lastWatchPosition) {
                            _playedSinceMove = Duration.zero;
                            _lastWatchPosition = position;
                          }
                          progressSeconds = position.inSeconds.toDouble();
                          if (duration.inSeconds > 0) {
                            totalSeconds = duration.inSeconds.toDouble();
                          }
                          if (_watch.watchedEnough) _onVideoProgress();
                        },
                        onEnded: () {
                          if (!mounted) return;
                          _watch.markEnded();
                          _onVideoProgress();
                        },
                      ),
                    ),
                    Positioned(
                      top: 10,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.navy.withValues(alpha: 0.72),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                        ),
                        child: Text(
                          _preferLocal
                              ? 'OFFLINE'
                              : (_source.isYouTube ? 'YOUTUBE' : 'STREAM'),
                          style: const TextStyle(
                            color: AppColors.cream,
                            fontWeight: FontWeight.w800,
                            fontSize: 10,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 4,
                      right: 4,
                      child: StoreConfig.showOfflineDownload
                          ? _buildDownloadButton()
                          : const SizedBox.shrink(),
                    ),
                    Positioned(
                      bottom: 4,
                      right: 4,
                      child: IconButton(
                        icon: Icon(
                          isFullScreen ? Icons.fullscreen_exit : Icons.fullscreen,
                          color: AppColors.cream,
                          size: 22,
                        ),
                        onPressed: () => _setFullScreen(!isFullScreen),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            if (!isFullScreen)
              Expanded(
                child: ColoredBox(
                  color: AppColors.cream,
                  child: ListView(
                    padding: const EdgeInsets.only(top: 12, bottom: 28),
                    children: [
                      if (lesson.takeaways.isNotEmpty) ...[
                        const Padding(
                          padding: EdgeInsets.fromLTRB(32, 4, 32, 4),
                          child: Text(
                            'Things to expect',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.45,
                              height: 1.15,
                              color: AppColors.navy,
                            ),
                          ),
                        ),
                        CupertinoListSection.insetGrouped(
                          margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                          backgroundColor: AppColors.cream,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          separatorColor:
                              const Color(0xFFC6C6C8).withValues(alpha: 0.55),
                          additionalDividerMargin: 52,
                          children: [
                            for (var i = 0; i < lesson.takeaways.length; i++)
                              CupertinoListTile(
                                padding: const EdgeInsetsDirectional.fromSTEB(
                                    16, 12, 16, 12),
                                leadingSize: 28,
                                leadingToTitle: 10,
                                leading: Text(
                                  '${i + 1}'.padLeft(2, '0'),
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: -0.2,
                                    fontFeatures: [
                                      FontFeature.tabularFigures()
                                    ],
                                    color: AppColors.orange,
                                  ),
                                ),
                                title: Text(
                                  lesson.takeaways[i],
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w400,
                                    letterSpacing: -0.4,
                                    height: 1.25,
                                    color: AppColors.navy,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
      ),
    );
  }
}
