import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

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
  late final String _viewType;
  html.IFrameElement? _iframe;

  String get _src {
    final start = widget.seekTo?.inSeconds ?? 0;
    final autoplay = widget.autoPlay || start > 0 ? '1' : '0';
    return 'https://www.youtube.com/embed/${widget.videoId}'
        '?rel=0&autoplay=$autoplay&playsinline=1&start=$start';
  }

  @override
  void initState() {
    super.initState();
    _viewType = 'youtube-embed-${widget.videoId}-${identityHashCode(this)}';
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = html.IFrameElement()
        ..src = _src
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.objectFit = 'contain'
        ..allowFullscreen = true
        ..allow =
            'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      _iframe = iframe;
      return iframe;
    });
  }

  @override
  void didUpdateWidget(covariant YoutubeEmbed oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.seekTo != oldWidget.seekTo ||
        widget.seekGeneration != oldWidget.seekGeneration ||
        widget.videoId != oldWidget.videoId) {
      _iframe?.src = _src;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: HtmlElementView(viewType: _viewType),
        ),
      ),
    );
  }
}
