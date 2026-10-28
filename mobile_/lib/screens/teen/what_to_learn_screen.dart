import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../models/video_lesson.dart';
import '../../models/week_video_progress.dart';
import '../../providers/cms_text.dart';
import '../../services/content_service.dart';
import '../../theme.dart';
import 'widgets/curriculum_week_tile.dart';
import 'widgets/week_video_progress_card.dart';
import 'bible_catalog_screen.dart';
import 'video_learning_screen.dart';
import 'week_lesson_detail_screen.dart';

class WhatToLearnScreen extends StatefulWidget {
  const WhatToLearnScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<WhatToLearnScreen> createState() => _WhatToLearnScreenState();
}

class _WhatToLearnScreenState extends State<WhatToLearnScreen> {
  List<LearningTrackView> _tracks = const [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final tracks = await context.read<ContentService>().getAssignedTracks(context.read<AuthSession>());
      if (!mounted) return;
      setState(() {
        _tracks = tracks;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  bool _canEdit(CurriculumTrack track) {
    final session = context.read<AuthSession>();
    if (session.isParent && track == CurriculumTrack.home) return true;
    if (session.isAdultTeen && track == CurriculumTrack.personal) return true;
    return false;
  }

  String _emptyCopy(AuthSession session) {
    if (session.isUnderAgeExplorer) {
      return 'Your parent will add weeks here.';
    }
    return 'Add weeks from the Bible tab. They stay in catalog order.';
  }

  Future<void> _remove(CurriculumTrack track, String questId) async {
    final session = context.read<AuthSession>();
    await context.read<ContentService>().removeWeekFromPlan(track, questId, childId: session.childId);
    await _load();
  }

  void _openCatalog() {
    Navigator.push(context, MaterialPageRoute(builder: (_) => const BibleCatalogScreen()));
  }

  Widget _body() {
    final session = context.watch<AuthSession>();
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    final hasWeeks = _tracks.any((track) => track.weeks.isNotEmpty);
    return RefreshIndicator(
      onRefresh: () => Future.wait([_load(), refreshDashboardCopy(context)]),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          const Text(
            'What to learn',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppColors.navy),
          ),
          const SizedBox(height: 6),
          Text(
            session.isUnderAgeExplorer
                ? 'Weeks your family assigned.'
                : session.isParent
                    ? 'Home weeks follow the catalog. You can add or remove, not reshuffle.'
                    : 'Home follows your parent. My weeks are yours.',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
          ),
          if (!session.isUnderAgeExplorer) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: _openCatalog,
                icon: const Icon(Icons.menu_book_outlined),
                label: const Text('Browse Bible'),
              ),
            ),
          ],
          const SizedBox(height: 8),
          if (!hasWeeks)
            Padding(
              padding: const EdgeInsets.only(top: 24),
              child: Text(_emptyCopy(session), style: const TextStyle(color: AppColors.textSecondary)),
            )
          else
            for (final track in _tracks) ...[
              Text(
                track.label,
                style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
              ),
              const SizedBox(height: 8),
              if (track.weeks.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(bottom: 16),
                  child: Text('Nothing on this track yet.', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
                )
              else
                for (var i = 0; i < track.weeks.length; i++) ...[
                  CurriculumWeekTile(
                    week: track.weeks[i],
                    onTap: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => WeekLessonDetailScreen(week: track.weeks[i], track: track.track),
                        ),
                      );
                      if (mounted) _load();
                    },
                    trailing: _canEdit(track.track)
                        ? IconButton(
                            tooltip: 'Remove',
                            onPressed: () => _remove(track.track, track.weeks[i].id),
                            icon: const Icon(Icons.remove_circle_outline),
                          )
                        : null,
                  ),
                  const SizedBox(height: 10),
                ],
              const SizedBox(height: 10),
            ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.embedded) return ColoredBox(color: AppColors.cream, child: _body());
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(title: const Text('What to learn')),
      body: _body(),
    );
  }
}

class CurrentlyActiveWeekCard extends StatefulWidget {
  const CurrentlyActiveWeekCard({super.key});

  @override
  State<CurrentlyActiveWeekCard> createState() => _CurrentlyActiveWeekCardState();
}

class _CurrentlyActiveWeekCardState extends State<CurrentlyActiveWeekCard> {
  TeenQuest? _week;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    ContentService content;
    AuthSession session;
    try {
      content = context.read<ContentService>();
      session = context.read<AuthSession>();
    } catch (_) {
      return;
    }
    final tracks = await content.getAssignedTracks(session);
    TeenQuest? week;
    for (final item in tracks) {
      if (item.weeks.isEmpty) continue;
      week = item.weeks.firstWhere(
        (candidate) => !content.weekVideosComplete(candidate, childId: session.childId),
        orElse: () => item.weeks.first,
      );
      break;
    }
    if (!mounted) return;
    setState(() {
      _week = week;
    });
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final week = _week;
    final videos = (week != null && week.videos.isNotEmpty)
        ? week.videos.take(WeekVideoProgress.slotCount).toList()
        : const <VideoLesson>[];

    var watchedCompleted = 0;
    try {
      final content = context.read<ContentService>();
      final session = context.read<AuthSession>();
      if (week != null) {
        watchedCompleted = WeekVideoProgress.sequentialCompleted(
          videos: videos,
          isWatched: (video) => content.isVideoWatched(week, video.id, childId: session.childId),
        );
      }
    } catch (_) {}

    final completed = watchedCompleted > game.completedVideoParts
        ? watchedCompleted
        : game.completedVideoParts;
    final progress = WeekVideoProgress(
      videos: videos,
      completedCount: completed,
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: WeekVideoProgressCard(
        progress: progress,
        weekLabel: 'Week video progress',
        onOpenVideo: (lesson) => _openLesson(context, lesson),
      ),
    );
  }

  Future<void> _openLesson(BuildContext context, VideoLesson lesson) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => VideoLearningScreen(
          lesson: lesson,
          weekLabel: 'Week ${lesson.weekNumber} Quest',
          lessonTitle: lesson.title,
        ),
      ),
    );
    if (mounted) _load();
  }
}
