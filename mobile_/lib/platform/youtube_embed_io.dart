import 'package:flutter/material.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import '../theme.dart';

class YoutubeEmbed extends StatefulWidget {
  const YoutubeEmbed({
    super.key,
    required this.videoId,
    this.onPosition,
    this.onEnded,
    this.seekTo,
    this.seekGeneration = 0,
    this.autoPlay = false,
  });

  final String videoId;
  final void Function(Duration position, Duration duration)? onPosition;
  final VoidCallback? onEnded;
  final Duration? seekTo;
  final int seekGeneration;
  final bool autoPlay;

  @override
  State<YoutubeEmbed> createState() => _YoutubeEmbedState();
}

class _YoutubeEmbedState extends State<YoutubeEmbed> {
  late YoutubePlayerController _controller;
  Duration? _pendingSeek;
  bool _endedFired = false;

  @override
  void initState() {
    super.initState();
    _controller = YoutubePlayerController(
      initialVideoId: widget.videoId,
      flags: YoutubePlayerFlags(
        autoPlay: widget.autoPlay,
        mute: false,
        disableDragSeek: false,
        enableCaption: true,
        hideThumbnail: true,
      ),
    )..addListener(_onTick);
    if (widget.seekTo != null && widget.seekTo! > Duration.zero) {
      _pendingSeek = widget.seekTo;
    }
  }

  @override
  void didUpdateWidget(covariant YoutubeEmbed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.seekTo != null &&
        (widget.seekTo != oldWidget.seekTo ||
            widget.seekGeneration != oldWidget.seekGeneration)) {
      _applySeek(widget.seekTo!);
    }
  }

  void _applySeek(Duration to) {
    if (_controller.value.isReady) {
      _controller.seekTo(to, allowSeekAhead: true);
      _controller.play();
      _pendingSeek = null;
    } else {
      _pendingSeek = to;
    }
  }

  void _onTick() {
    final value = _controller.value;
    if (_pendingSeek != null && value.isReady) {
      final pending = _pendingSeek!;
      _pendingSeek = null;
      _controller.seekTo(pending, allowSeekAhead: true);
      _controller.play();
    }
    widget.onPosition?.call(value.position, value.metaData.duration);
    if (!_endedFired && value.playerState == PlayerState.ended) {
      _endedFired = true;
      widget.onEnded?.call();
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_onTick);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final size = _fit16x9(constraints.maxWidth, constraints.maxHeight);
          return Center(
            child: SizedBox(
              width: size.width,
              height: size.height,
              child: YoutubePlayer(
                controller: _controller,
                width: size.width,
                showVideoProgressIndicator: true,
                progressIndicatorColor: AppColors.gold,
                progressColors: const ProgressBarColors(
                  playedColor: AppColors.orange,
                  handleColor: AppColors.gold,
                ),
                bottomActions: [
                  CurrentPosition(),
                  ProgressBar(isExpanded: true),
                  RemainingDuration(),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

Size _fit16x9(double maxWidth, double maxHeight) {
  if (!maxWidth.isFinite || !maxHeight.isFinite || maxWidth <= 0 || maxHeight <= 0) {
    return const Size(16, 9);
  }
  final byWidth = Size(maxWidth, maxWidth * 9 / 16);
  if (byWidth.height <= maxHeight) return byWidth;
  return Size(maxHeight * 16 / 9, maxHeight);
}
