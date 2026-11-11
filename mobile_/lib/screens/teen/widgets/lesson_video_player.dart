import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../../models/video_lesson.dart';
import '../../../models/video_source.dart';
import '../../../platform/local_fs.dart';
import '../../../platform/youtube_embed.dart';
import '../../../theme.dart';

class LessonVideoPlayer extends StatefulWidget {
  const LessonVideoPlayer({
    super.key,
    required this.lesson,
    this.localFilePath,
    this.useLocalFile = false,
    this.seekTo,
    this.seekGeneration = 0,
    this.onPosition,
    this.onEnded,
  });

  final VideoLesson lesson;
  final String? localFilePath;
  final bool useLocalFile;
  final Duration? seekTo;
  final int seekGeneration;
  final void Function(Duration position, Duration duration)? onPosition;
  final VoidCallback? onEnded;

  @override
  State<LessonVideoPlayer> createState() => LessonVideoPlayerState();
}

class LessonVideoPlayerState extends State<LessonVideoPlayer> {
  VideoPlayerController? _fileOrNetwork;
  bool _endedFired = false;
  VideoSource get _source =>
      VideoSource.parse(widget.lesson.videoUrl, downloadUrl: widget.lesson.downloadUrl);

  @override
  void initState() {
    super.initState();
    _initPlayer();
  }

  @override
  void didUpdateWidget(covariant LessonVideoPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.useLocalFile != widget.useLocalFile ||
        oldWidget.localFilePath != widget.localFilePath ||
        oldWidget.lesson.videoUrl != widget.lesson.videoUrl) {
      _disposeFilePlayer();
      _initPlayer();
    } else if (widget.seekTo != null &&
        (widget.seekTo != oldWidget.seekTo ||
            widget.seekGeneration != oldWidget.seekGeneration)) {
      _seek(widget.seekTo!);
    }
  }

  void _initPlayer() {
    if (widget.useLocalFile &&
        widget.localFilePath != null &&
        localFileExistsSync(widget.localFilePath!)) {
      final controller = createFileVideoController(widget.localFilePath!);
      if (controller != null) {
        _fileOrNetwork = controller
          ..initialize().then((_) {
            if (!mounted) return;
            _fileOrNetwork!.play();
            setState(() {});
            _fileOrNetwork!.addListener(_onFileTick);
          });
      }
      return;
    }

    if (_source.isYouTube) {
      return;
    }

    if (_source.isDirectFile) {
      _fileOrNetwork = VideoPlayerController.networkUrl(Uri.parse(_source.directFileUrl!))
        ..initialize().then((_) {
          if (!mounted) return;
          _fileOrNetwork!.play();
          setState(() {});
          _fileOrNetwork!.addListener(_onFileTick);
        });
    }
  }

  void _onFileTick() {
    final player = _fileOrNetwork;
    if (player == null || !player.value.isInitialized) return;
    final duration = player.value.duration;
    final position = player.value.position;
    widget.onPosition?.call(position, duration);
    if (!_endedFired &&
        duration > Duration.zero &&
        player.value.isCompleted) {
      _endedFired = true;
      widget.onEnded?.call();
    }
  }

  void _seek(Duration to) {
    final player = _fileOrNetwork;
    if (player != null && player.value.isInitialized) {
      player.seekTo(to);
      player.play();
    }
  }

  void _disposeFilePlayer() {
    _fileOrNetwork?.removeListener(_onFileTick);
    _fileOrNetwork?.dispose();
    _fileOrNetwork = null;
  }

  @override
  void dispose() {
    _disposeFilePlayer();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_source.isYouTube && !(widget.useLocalFile && widget.localFilePath != null)) {
      return YoutubeEmbed(
        videoId: _source.youtubeId!,
        autoPlay: true,
        onPosition: widget.onPosition,
        onEnded: widget.onEnded,
        seekTo: widget.seekTo,
        seekGeneration: widget.seekGeneration,
      );
    }

    final filePlayer = _fileOrNetwork;
    if (filePlayer != null && filePlayer.value.isInitialized) {
      return ColoredBox(
        color: Colors.black,
        child: Center(
          child: AspectRatio(
            aspectRatio: filePlayer.value.aspectRatio == 0 ? 16 / 9 : filePlayer.value.aspectRatio,
            child: Stack(
              alignment: Alignment.bottomCenter,
              children: [
                VideoPlayer(filePlayer),
                VideoProgressIndicator(filePlayer, allowScrubbing: true),
                Center(
                  child: IconButton(
                    iconSize: 56,
                    color: Colors.white,
                    icon: Icon(filePlayer.value.isPlaying ? Icons.pause_circle : Icons.play_circle),
                    onPressed: () {
                      setState(() {
                        filePlayer.value.isPlaying ? filePlayer.pause() : filePlayer.play();
                      });
                    },
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (filePlayer != null) {
      return const ColoredBox(
        color: Colors.black,
        child: Center(child: CircularProgressIndicator(color: AppColors.gold)),
      );
    }

    return ColoredBox(
      color: AppColors.navy,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Text(
            _source.rawUrl.isEmpty
                ? 'Add a YouTube link on this lesson to stream it here.'
                : 'This lesson needs a YouTube URL (watch, youtu.be, or embed) to stream.',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.cream,
              fontWeight: FontWeight.w700,
              height: 1.35,
            ),
          ),
        ),
      ),
    );
  }
}
