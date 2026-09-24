import 'package:flutter/material.dart';
import '../../../models/video_lesson.dart';
import '../../../models/week_video_progress.dart';
import '../../../theme.dart';

class WeekVideoProgressCard extends StatelessWidget {
  const WeekVideoProgressCard({
    super.key,
    required this.progress,
    required this.onOpenVideo,
    this.weekLabel,
  });

  final WeekVideoProgress progress;
  final void Function(VideoLesson lesson) onOpenVideo;
  final String? weekLabel;

  @override
  Widget build(BuildContext context) {
    final current = progress.lessonAt(progress.currentIndex);
    final subtitle = progress.weekComplete
        ? 'All 3 videos finished. Tap a bar to rewatch.'
        : 'Video ${progress.currentIndex + 1} of ${WeekVideoProgress.slotCount}'
            '${current == null ? '' : ' · ${current.title}'}';

    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: AppRadii.cardRadius,
        side: const BorderSide(color: AppColors.border),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              weekLabel ?? 'Week video progress',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 16,
                color: AppColors.navy,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                height: 1.35,
                color: AppColors.textMuted,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                for (var i = 0; i < WeekVideoProgress.slotCount; i++) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(
                    child: _VideoProgressBar(
                      index: i,
                      progress: progress,
                      onTap: () => _handleTap(context, i),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (var i = 0; i < WeekVideoProgress.slotCount; i++) ...[
                  if (i > 0) const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Video ${i + 1}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: progress.isCurrent(i)
                            ? AppColors.orange
                            : progress.isComplete(i)
                                ? AppColors.forestGreen
                                : AppColors.textMuted,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _handleTap(BuildContext context, int index) {
    final lesson = progress.lessonAt(index);
    if (lesson == null || progress.isLocked(index)) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            progress.currentIndex + 1 <= WeekVideoProgress.slotCount
                ? 'Finish video ${progress.currentIndex + 1} before watching the next one.'
                : 'This video is not available yet.',
          ),
          backgroundColor: AppColors.navy,
        ),
      );
      return;
    }
    onOpenVideo(lesson);
  }
}

class _VideoProgressBar extends StatelessWidget {
  const _VideoProgressBar({
    required this.index,
    required this.progress,
    required this.onTap,
  });

  final int index;
  final WeekVideoProgress progress;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final current = progress.isCurrent(index);
    final done = progress.isComplete(index);
    final locked = progress.isLocked(index);
    final fill = done
        ? 1.0
        : current
            ? 0.45
            : 0.0;
    final color = done
        ? AppColors.forestGreen
        : current
            ? AppColors.orange
            : AppColors.border;

    return Semantics(
      button: true,
      enabled: !locked,
      label: 'Video ${index + 1} progress',
      child: InkWell(
        key: ValueKey('week-video-bar-$index'),
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          height: current ? 18 : 14,
          decoration: BoxDecoration(
            color: AppColors.surfaceVariant,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: current ? AppColors.orange : AppColors.border,
              width: current ? 1.6 : 1,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: Align(
            alignment: Alignment.centerLeft,
            child: FractionallySizedBox(
              widthFactor: fill,
              heightFactor: 1,
              child: ColoredBox(color: color),
            ),
          ),
        ),
      ),
    );
  }
}
