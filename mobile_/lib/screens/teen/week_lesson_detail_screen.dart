import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../models/video_lesson.dart';
import '../../models/week_video_progress.dart';
import '../../services/content_service.dart';
import '../../theme.dart';
import 'matching_screen.dart';
import 'objective_quiz_screen.dart';
import 'puzzle_screen.dart';
import 'video_learning_screen.dart';
import 'week_quest_flow.dart';
import '../shared/widgets/lesson_thumbnail.dart';
import '../shared/widgets/adventure_list_card.dart';

class WeekLessonDetailScreen extends StatefulWidget {
  const WeekLessonDetailScreen({
    super.key,
    required this.week,
    this.track,
  });

  final TeenQuest week;
  final CurriculumTrack? track;

  @override
  State<WeekLessonDetailScreen> createState() => _WeekLessonDetailScreenState();
}

class _WeekLessonDetailScreenState extends State<WeekLessonDetailScreen> {
  bool _onHome = false;
  bool _onPersonal = false;
  bool _quizOpen = false;
  bool _puzzleOpen = false;
  bool _selfLearn = false;
  bool _loading = true;

  TeenQuest get week => widget.week;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final session = context.read<AuthSession>();
    final content = context.read<ContentService>();
    final childId = session.childId;
    final onHome = await content.isWeekOnPlan(CurriculumTrack.home, week.id);
    final onPersonal = await content.isWeekOnPlan(
      CurriculumTrack.personal,
      week.id,
      childId: childId,
    );
    var quizOpen = false;
    var puzzleOpen = false;
    if (onHome) {
      quizOpen = true;
      puzzleOpen = true;
    }
    final selfLearn = !onHome && onPersonal && content.weekVideosComplete(week, childId: childId);
    if (selfLearn) {
      quizOpen = true;
      puzzleOpen = true;
    }
    if (!mounted) return;
    setState(() {
      _onHome = onHome;
      _onPersonal = onPersonal;
      _quizOpen = quizOpen;
      _puzzleOpen = puzzleOpen;
      _selfLearn = selfLearn;
      _loading = false;
    });
  }

  CurriculumTrack get _manageTrack {
    if (widget.track != null) return widget.track!;
    return context.read<ContentService>().manageTrackFor(context.read<AuthSession>());
  }

  bool get _canManage {
    final session = context.read<AuthSession>();
    if (session.isUnderAgeExplorer) return false;
    if (session.isParent) return true;
    return session.isAdultTeen;
  }

  bool get _isOnManagePlan {
    switch (_manageTrack) {
      case CurriculumTrack.home:
        return _onHome;
      case CurriculumTrack.personal:
        return _onPersonal;
    }
  }

  String get _addLabel => 'Add to What to learn';

  Future<void> _togglePlan() async {
    final session = context.read<AuthSession>();
    final content = context.read<ContentService>();
    if (_isOnManagePlan) {
      await content.removeWeekFromPlan(_manageTrack, week.id, childId: session.childId);
    } else {
      await content.addWeekToPlan(_manageTrack, week.id, childId: session.childId);
    }
    await _load();
  }

  Future<void> _openPuzzle() async {
    if (!_puzzleOpen) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_lockCopy(puzzle: true))),
      );
      return;
    }
    final matchingId = week.matchingId?.trim();
    if (week.isMatchingGame && matchingId != null && matchingId.isNotEmpty) {
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => MatchingScreen(matchingId: matchingId),
        ),
      );
      return;
    }
    final game = context.read<GameController>();
    final content = context.read<ContentService>();
    final puzzleId = week.puzzleId?.trim();
    if (puzzleId == null || puzzleId.isEmpty) {
      game.markTechnicalIssue('This week has no game attached yet.');
    } else {
      try {
        await game.loadLiveFromDatabase(
          contentService: content,
          puzzleId: puzzleId,
        );
      } catch (_) {}
    }
    if (!mounted) return;
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => const PuzzleScreen()),
    );
    if (mounted) await WeekQuestFlow.recordPuzzleIfSolved(context);
  }

  WeekVideoProgress _videoProgress() {
    var sessionCompleted = 0;
    try {
      sessionCompleted = context.watch<GameController>().completedVideoParts;
    } catch (_) {}
    final content = context.read<ContentService>();
    final childId = context.read<AuthSession>().childId;
    final watchedCompleted = WeekVideoProgress.sequentialCompleted(
      videos: week.videos,
      isWatched: (video) => content.isVideoWatched(week, video.id, childId: childId),
      sessionCompleted: sessionCompleted,
    );
    return WeekVideoProgress(videos: week.videos, completedCount: watchedCompleted);
  }

  String _lockCopy({required bool puzzle}) {
    return puzzle
        ? 'Finish every video in this week to open ${widget.week.gameStepTitle}.'
        : 'Finish every video in this week to open the quiz.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        title: Text('Week ${week.weekNumber}', style: const TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
              children: [
                Text(
                  week.title,
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 24, color: AppColors.navy),
                ),
                const SizedBox(height: 6),
                Text(week.scripture, style: const TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                Text(week.content, style: const TextStyle(height: 1.45, color: AppColors.textPrimary)),
                if (_canManage) ...[
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: _togglePlan,
                    style: FilledButton.styleFrom(
                      backgroundColor: _isOnManagePlan ? AppColors.navy : AppColors.orange,
                    ),
                    child: Text(_isOnManagePlan ? 'Remove from What to learn' : _addLabel),
                  ),
                ],
                const SizedBox(height: 22),
                const Text('Videos', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy)),
                const SizedBox(height: 8),
                if (week.videos.isEmpty)
                  const Text('No videos on this week yet.', style: TextStyle(color: AppColors.textMuted))
                else
                  for (var i = 0; i < week.videos.length; i++) ...[
                    _VideoRow(
                      video: week.videos[i],
                      index: i,
                      progress: _videoProgress(),
                      onReturned: _load,
                    ),
                    const SizedBox(height: 8),
                  ],
                const SizedBox(height: 16),
                const Text('Bible portions', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy)),
                const SizedBox(height: 8),
                if (week.biblePortions.isEmpty)
                  const Text('No Bible portions on this week yet.', style: TextStyle(color: AppColors.textMuted))
                else
                  for (final portion in week.biblePortions) ...[
                    _PortionCard(portion: portion),
                    const SizedBox(height: 8),
                  ],
                const SizedBox(height: 16),
                Text('Quiz & ${week.gameStepTitle}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy)),
                const SizedBox(height: 6),
                Text(
                  _onHome
                      ? 'Quiz and ${week.gameStepTitle} are open for this week.'
                      : _selfLearn
                          ? 'Unlocked after you finished the last video.'
                          : 'Finish every video to unlock the quiz and ${week.gameStepTitle}.',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: _quizOpen
                      ? () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ObjectiveQuizScreen(
                                questionsOverride: week.objectiveQuiz.map((q) => q.toQuizQuestion()).toList(),
                              ),
                            ),
                          );
                        }
                      : () {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_lockCopy(puzzle: false))));
                        },
                  icon: const Icon(Icons.quiz_outlined),
                  label: Text(_quizOpen ? 'Start quiz' : 'Quiz locked'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  onPressed: _openPuzzle,
                  icon: const Icon(Icons.grid_view_rounded),
                  label: Text(
                    _puzzleOpen
                        ? 'Start ${week.gameStepTitle}'
                        : '${week.gameStepTitle} locked',
                  ),
                ),
              ],
            ),
    );
  }
}

class _VideoRow extends StatelessWidget {
  const _VideoRow({
    required this.video,
    required this.index,
    required this.progress,
    required this.onReturned,
  });

  final VideoLesson video;
  final int index;
  final WeekVideoProgress progress;
  final Future<void> Function() onReturned;

  @override
  Widget build(BuildContext context) {
    final locked = progress.isLocked(index);
    final done = progress.isComplete(index);
    final accent = locked
        ? AdventureListAccent.navy
        : done
            ? AdventureListAccent.green
            : AdventureListAccent.orange;
    return AdventureListCard(
      title: video.title,
      subtitle: locked
          ? 'Locked · finish video ${progress.currentIndex + 1} first'
          : done
              ? '${video.duration} · Rewatch'
              : '${video.duration} · ${video.subtitle}',
      icon: Icons.play_circle_outline,
      accent: accent,
      leading: SizedBox(
        width: 44,
        height: 44,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: LessonThumbnail(lesson: video, height: 44),
        ),
      ),
      trailing: Icon(
        locked
            ? Icons.lock_rounded
            : done
                ? Icons.replay_rounded
                : Icons.chevron_right_rounded,
        color: locked
            ? AppColors.textMuted
            : done
                ? AppColors.forestGreen
                : AppColors.orange,
      ),
      onTap: () async {
        if (locked) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Finish video ${progress.currentIndex + 1} before watching the next one.'),
              backgroundColor: AppColors.navy,
            ),
          );
          return;
        }
        await Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => VideoLearningScreen(lesson: video)),
        );
        if (!context.mounted) return;
        await onReturned();
      },
    );
  }
}

class _PortionCard extends StatelessWidget {
  const _PortionCard({required this.portion});

  final BiblePortion portion;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFDF7),
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.gold.withValues(alpha: 0.45)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(portion.reference, style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.orange)),
          if (portion.passage.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(portion.passage, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          ],
          if (portion.text.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(portion.text, style: const TextStyle(height: 1.4, color: AppColors.navy)),
          ],
        ],
      ),
    );
  }
}
