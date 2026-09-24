import 'package:flutter/material.dart';
import '../../../data/youtube_lesson_urls.dart';
import '../../../models/video_source.dart';
import '../../../models/week_quest_progress.dart';
import '../../../theme.dart';
import '../../shared/widgets/adventure_list_card.dart';

class TodaysQuestSlide extends StatelessWidget {
  const TodaysQuestSlide({
    super.key,
    required this.passage,
    required this.subtitle,
    required this.videoSubtitles,
    required this.onOpenVideo,
    required this.onQuiz,
    required this.onPuzzle,
    required this.progress,
    this.sidePadding = 16,
  });

  final String passage;
  final String subtitle;
  final List<String> videoSubtitles;
  final void Function(int index) onOpenVideo;
  final VoidCallback onQuiz;
  final VoidCallback onPuzzle;
  final WeekQuestProgress progress;
  final double sidePadding;

  static const int cardCount = 3;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(sidePadding, 20, sidePadding, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            "Today's Quest",
            maxLines: 2,
            style: TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w600,
              fontSize: 20,
              letterSpacing: -0.5,
              height: 1.15,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w400,
              fontSize: 15,
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 16),
          _nextStep(),
        ],
      ),
    );
  }

  Widget _nextStep() {
    final videoIndex = progress.nextVideoIndex;
    if (videoIndex != null) {
      return SizedBox(
        key: ValueKey('home-video-$videoIndex'),
        height: 178,
        child: TodaysQuestCard(
          label: 'Video ${videoIndex + 1}',
          passage: passage,
          subtitle: videoIndex < videoSubtitles.length
              ? videoSubtitles[videoIndex]
              : 'Video ${videoIndex + 1}',
          onStart: () => onOpenVideo(videoIndex),
        ),
      );
    }
    if (!progress.quizDone) {
      return AdventureListCard(
        icon: Icons.quiz_rounded,
        title: 'Quiz',
        subtitle: 'Objective questions for this week.',
        accent: AdventureListAccent.navy,
        onTap: onQuiz,
      );
    }
    if (!progress.puzzleDone) {
      return AdventureListCard(
        icon: Icons.extension_rounded,
        title: 'Puzzle',
        subtitle: 'Bible puzzle adventure for this week.',
        accent: AdventureListAccent.teal,
        onTap: onPuzzle,
      );
    }
    return const _CaughtUpCard();
  }
}

class _CaughtUpCard extends StatelessWidget {
  const _CaughtUpCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.check_circle_rounded,
                  color: AppColors.forestGreen, size: 22),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  "You're caught up",
                  style: TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w700,
                    fontSize: 17,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Text(
            "You've finished this week's quest. Come back when the next week opens.",
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 14,
              height: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class TodaysQuestCard extends StatelessWidget {
  const TodaysQuestCard({
    super.key,
    required this.passage,
    required this.subtitle,
    required this.onStart,
    this.label = "Today's Quest",
    this.showPlay = true,
  });

  final String label;
  final String passage;
  final String subtitle;
  final VoidCallback onStart;
  final bool showPlay;

  static final VideoSource _backdrop =
      VideoSource.parse(YoutubeLessonUrls.todaysQuestBackdrop);

  @override
  Widget build(BuildContext context) {
    final thumbUrl = _backdrop.youtubeThumbnailUrl;
    return Container(
      width: double.infinity,
      height: 178,
      decoration: BoxDecoration(
        color: AppColors.navy,
        borderRadius: AppRadii.cardRadius,
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.28),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          if (thumbUrl != null)
            Positioned.fill(
              child: Image.network(
                thumbUrl,
                fit: BoxFit.cover,
                alignment: Alignment.centerRight,
                errorBuilder: (_, __, ___) =>
                    const ColoredBox(color: AppColors.navy),
              ),
            ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  stops: const [0.0, 0.16, 0.30, 0.44, 0.58, 1.0],
                  colors: [
                    AppColors.navy,
                    AppColors.navy.withValues(alpha: 0.94),
                    AppColors.navy.withValues(alpha: 0.72),
                    AppColors.navy.withValues(alpha: 0.38),
                    AppColors.navy.withValues(alpha: 0.08),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
          if (showPlay)
            Positioned(
              right: 18,
              top: 0,
              bottom: 0,
              child: Center(
                child: IconButton(
                  tooltip: 'Watch video',
                  onPressed: onStart,
                  style: IconButton.styleFrom(
                    backgroundColor: Colors.black.withValues(alpha: 0.45),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.all(12),
                  ),
                  icon: const Icon(Icons.play_arrow_rounded, size: 36),
                ),
              ),
            ),
          LayoutBuilder(
            builder: (context, constraints) {
              return Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                child: SizedBox(
                  width: constraints.maxWidth * 0.62,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.auto_stories_rounded,
                              color: AppColors.gold, size: 18),
                          const SizedBox(width: 6),
                          Text(
                            label,
                            style: const TextStyle(
                              color: AppColors.cream,
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                              letterSpacing: -0.1,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        passage,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.cream,
                          fontWeight: FontWeight.w600,
                          fontSize: 20,
                          height: 1.1,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: AppColors.cream.withValues(alpha: 0.85),
                          fontWeight: FontWeight.w400,
                          fontSize: 12,
                        ),
                      ),
                      const Spacer(),
                      Align(
                        alignment: Alignment.centerLeft,
                        child: FittedBox(
                          child: FilledButton(
                            onPressed: onStart,
                            style: FilledButton.styleFrom(
                              backgroundColor: AppColors.orange,
                              foregroundColor: Colors.white,
                              visualDensity: VisualDensity.compact,
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              shape: RoundedRectangleBorder(
                                borderRadius: AppRadii.cardRadius,
                              ),
                            ),
                            child: const Text(
                              'Start Reading',
                              style: TextStyle(
                                  fontWeight: FontWeight.w600, fontSize: 13),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
