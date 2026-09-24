import 'package:flutter/material.dart';
import '../../../models/video_lesson.dart';

/// Renders the official Drive/asset thumb, else the matching YouTube frame.
class LessonThumbnail extends StatelessWidget {
  const LessonThumbnail({
    super.key,
    required this.lesson,
    this.height = 110,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.child,
  });

  final VideoLesson lesson;
  final double height;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final src = lesson.resolvedThumbnail;
    Widget background;
    if (src == null) {
      background = ColoredBox(
        color: Colors.black26,
        child: Center(
          child: Text(lesson.thumbnailEmoji, style: const TextStyle(fontSize: 28)),
        ),
      );
    } else if (src.startsWith('assets/')) {
      background = Image.asset(src, fit: fit, width: double.infinity, height: height);
    } else {
      background = Image.network(
        src,
        fit: fit,
        width: double.infinity,
        height: height,
        errorBuilder: (_, __, ___) => ColoredBox(
          color: Colors.black26,
          child: Center(
            child: Text(lesson.thumbnailEmoji, style: const TextStyle(fontSize: 28)),
          ),
        ),
      );
    }

    final framed = SizedBox(
      height: height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          background,
          if (child != null) child!,
        ],
      ),
    );

    if (borderRadius == null) return framed;
    return ClipRRect(borderRadius: borderRadius!, child: framed);
  }
}
