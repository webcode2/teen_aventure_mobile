import 'package:flutter/material.dart';
import '../../../providers/hero_copy.dart';
import '../../../theme.dart';

/// Home announcement from the admin content document.
/// A sentence that does not fit slides from right to left, then repeats.
class HomeAnnouncementBanner extends StatelessWidget {
  const HomeAnnouncementBanner({
    super.key,
    required this.announcement,
    this.onAction,
  });

  final HomeAnnouncement announcement;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    if (!announcement.visible) return const SizedBox.shrink();
    final badge = announcement.badge.trim();
    final text = announcement.text.trim();
    final action = announcement.actionLabel.trim();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Semantics(
        label: [badge, text, action].where((part) => part.isNotEmpty).join(' '),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: AppColors.orange.withValues(alpha: 0.14),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.orange.withValues(alpha: 0.35)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            child: Row(
              children: [
                if (badge.isNotEmpty) ...[
                  ExcludeSemantics(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.orange,
                        borderRadius: BorderRadius.circular(5),
                      ),
                      child: Text(
                        badge,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: text.isEmpty
                      ? const SizedBox.shrink()
                      : ExcludeSemantics(child: _MarqueeText(text: text)),
                ),
                if (action.isNotEmpty) ...[
                  const SizedBox(width: 8),
                  ExcludeSemantics(
                    child: GestureDetector(
                      onTap: onAction,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 120),
                        child: Text(
                          action,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AppColors.orange,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MarqueeText extends StatelessWidget {
  const _MarqueeText({required this.text});

  final String text;

  static const _style = TextStyle(
    color: AppColors.navy,
    fontSize: 12,
    fontWeight: FontWeight.w700,
    height: 1.2,
  );

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final painter = TextPainter(
          text: const TextSpan(text: '', style: _style),
          textDirection: TextDirection.ltr,
          maxLines: 1,
        )..text = TextSpan(text: text, style: _style);
        painter.layout();
        final maxWidth = constraints.maxWidth;
        final height = painter.height == 0 ? 16.0 : painter.height;
        if (!maxWidth.isFinite || painter.width <= maxWidth || MediaQuery.disableAnimationsOf(context)) {
          return SizedBox(
            height: height,
            child: Text(text, style: _style, maxLines: 1, overflow: TextOverflow.ellipsis),
          );
        }
        return _MarqueeLoop(
          text: text,
          textWidth: painter.width,
          height: height,
          style: _style,
        );
      },
    );
  }
}

class _MarqueeLoop extends StatefulWidget {
  const _MarqueeLoop({
    required this.text,
    required this.textWidth,
    required this.height,
    required this.style,
  });

  final String text;
  final double textWidth;
  final double height;
  final TextStyle style;

  @override
  State<_MarqueeLoop> createState() => _MarqueeLoopState();
}

class _MarqueeLoopState extends State<_MarqueeLoop> with SingleTickerProviderStateMixin {
  static const _gap = 48.0;
  static const _pixelsPerSecond = 36.0;
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: _duration)..repeat();
  }

  Duration get _duration {
    final travel = widget.textWidth + _gap;
    final millis = (travel / _pixelsPerSecond * 1000).round().clamp(1, 120000);
    return Duration(milliseconds: millis);
  }

  @override
  void didUpdateWidget(covariant _MarqueeLoop oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.textWidth != widget.textWidth) {
      _controller.duration = _duration;
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final travel = widget.textWidth + _gap;
    return SizedBox(
      height: widget.height,
      child: ClipRect(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return Transform.translate(
            offset: Offset(-_controller.value * travel, 0),
            child: OverflowBox(
              alignment: Alignment.centerLeft,
              minWidth: 0,
              maxWidth: double.infinity,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(widget.text, style: widget.style, maxLines: 1),
                  const SizedBox(width: _gap),
                  Text(widget.text, style: widget.style, maxLines: 1),
                ],
              ),
            ),
          );
        },
      ),
      ),
    );
  }
}
