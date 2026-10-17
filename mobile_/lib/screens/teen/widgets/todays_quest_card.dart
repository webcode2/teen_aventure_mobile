import 'package:flutter/material.dart';
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
    this.weekLabel,
    this.thumbnailUrl,
    this.allWeeksDone = false,
    this.stepsOpen = false,
    this.gameStepTitle = 'Puzzle',
  });

  final String passage;
  final String subtitle;
  final List<String> videoSubtitles;
  final String? thumbnailUrl;
  final void Function(int index) onOpenVideo;
  final VoidCallback onQuiz;
  final VoidCallback onPuzzle;
  final WeekQuestProgress progress;
  final double sidePadding;
  /// e.g. "Week 4" — the explorer's own place in the 52 weeks.
  final String? weekLabel;
  final bool allWeeksDone;

  /// Map browse: quiz and puzzle open even before the videos are watched.
  final bool stepsOpen;

  /// Home row label for the week's studio game ("Puzzle" or "Match").
  final String gameStepTitle;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(sidePadding, 20, sidePadding, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            weekLabel == null ? "Today's Quest" : "Today's Quest · $weekLabel",
            maxLines: 2,
            style: const TextStyle(
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
          ..._rows(context),
        ],
      ),
    );
  }

  List<Widget> _rows(BuildContext context) {
    final videosOpen = stepsOpen || progress.videosFinished;
    final active = progress.nextVideoIndex;
    final count = videoSubtitles.length < progress.videoCount ? videoSubtitles.length : progress.videoCount;
    final rows = <Widget>[];
    for (var index = 0; index < count; index++) {
      if (rows.isNotEmpty) rows.add(const SizedBox(height: 10));
      final title = videoSubtitles[index];
      if (progress.watchedAt(index)) {
        rows.add(
          AdventureListCard(
            key: ValueKey('home-video-$index'),
            icon: Icons.check_rounded,
            title: title,
            subtitle: 'Watched',
            accent: AdventureListAccent.green,
            onTap: () => onOpenVideo(index),
          ),
        );
      } else if (active == index) {
        rows.add(
          SizedBox(
            key: ValueKey('home-video-$index'),
            height: 178,
            child: TodaysQuestCard(
              label: 'Video ${index + 1}',
              passage: passage,
              subtitle: title,
              thumbnailUrl: thumbnailUrl,
              onStart: () => onOpenVideo(index),
            ),
          ),
        );
      } else {
        rows.add(
          AdventureListCard(
            key: ValueKey('home-video-$index'),
            icon: Icons.play_arrow_rounded,
            title: title,
            accent: AdventureListAccent.orange,
            onTap: () => onOpenVideo(index),
          ),
        );
      }
    }
    rows.add(const SizedBox(height: 10));
    rows.add(
      Opacity(
        opacity: videosOpen || progress.quizDone ? 1 : 0.45,
        child: progress.quizDone
            ? AdventureListCard(
                key: const ValueKey('home-quiz'),
                icon: Icons.check_rounded,
                title: 'Quiz',
                subtitle: 'Finished',
                accent: AdventureListAccent.green,
                onTap: onQuiz,
              )
            : AdventureListCard(
                key: const ValueKey('home-quiz'),
                icon: Icons.quiz_rounded,
                title: 'Quiz',
                accent: AdventureListAccent.navy,
                onTap: videosOpen ? onQuiz : () => _lockedTap(context, puzzle: false),
              ),
      ),
    );
    rows.add(const SizedBox(height: 10));
    rows.add(
      Opacity(
        opacity: videosOpen || progress.puzzleDone ? 1 : 0.45,
        child: progress.puzzleDone
            ? AdventureListCard(
                key: const ValueKey('home-puzzle'),
                icon: Icons.check_rounded,
                title: gameStepTitle,
                subtitle: 'Finished',
                accent: AdventureListAccent.green,
                onTap: onPuzzle,
              )
            : AdventureListCard(
                key: const ValueKey('home-puzzle'),
                icon: gameStepTitle == 'Match'
                    ? Icons.timeline_rounded
                    : Icons.extension_rounded,
                title: gameStepTitle,
                accent: AdventureListAccent.teal,
                onTap: videosOpen ? onPuzzle : () => _lockedTap(context, puzzle: true),
              ),
      ),
    );
    if (progress.isCaughtUp) {
      rows.add(const SizedBox(height: 12));
      rows.add(
        Text(
          allWeeksDone ? "You've finished every week!" : "You're caught up",
          style: TextStyle(
            color: AppColors.navy,
            fontWeight: FontWeight.w700,
            fontSize: 15,
          ),
        ),
      );
    }
    return rows;
  }

  void _lockedTap(BuildContext context, {required bool puzzle}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          puzzle
              ? 'Finish all ${progress.videoCount} videos to open the puzzle.'
              : 'Finish all ${progress.videoCount} videos to open the quiz.',
        ),
        backgroundColor: AppColors.navy,
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
    this.thumbnailUrl,
    this.showPlay = true,
  });

  final String label;
  final String passage;
  final String subtitle;
  final VoidCallback onStart;
  final String? thumbnailUrl;
  final bool showPlay;

  @override
  Widget build(BuildContext context) {
    final thumbUrl = thumbnailUrl?.trim();
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
          if (thumbUrl != null && thumbUrl.isNotEmpty)
            Positioned.fill(child: _QuestThumb(url: thumbUrl)),
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

class _QuestThumb extends StatelessWidget {
  const _QuestThumb({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    const fallback = ColoredBox(color: AppColors.navy);
    if (url.startsWith('http')) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        alignment: Alignment.centerRight,
        errorBuilder: (_, __, ___) => fallback,
      );
    }
    return Image.asset(
      url,
      fit: BoxFit.cover,
      alignment: Alignment.centerRight,
      errorBuilder: (_, __, ___) => fallback,
    );
  }
}
