import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../services/service_locator.dart';
import '../../theme.dart';
import '../groups/group_standing_board.dart';
import '../groups/teacher_class_members.dart';
import '../shared/widgets/adventure_list_card.dart';
import '../shared/widgets/circle_stats_card.dart';

/// Classes tab for church TEACHER — only assigned classes; members + points + cheers.
class TeacherHomeTab extends StatefulWidget {
  const TeacherHomeTab({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<TeacherHomeTab> createState() => _TeacherHomeTabState();
}

class _TeacherHomeTabState extends State<TeacherHomeTab> {
  String? _error;

  List<AssignedClass> _teachingClasses(AuthSession session) {
    return session.allAssignedClasses
        .where((c) => !c.isFamily)
        .toList(growable: false);
  }

  Future<void> _refresh() async {
    setState(() => _error = null);
    try {
      await context.read<AuthSession>().refreshProfile();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _openClass(AssignedClass cls) async {
    if (!mounted) return;
    await Navigator.of(context).push<void>(
      MaterialPageRoute(
        builder: (_) => TeacherClassDetailScreen(assignedClass: cls),
      ),
    );
  }

  Widget _yourClassesHeader() {
    return const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your classes',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
        ),
        SizedBox(height: 4),
        Text(
          'Open a class to see members, standing, and Objective Quiz.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    final classes = _teachingClasses(session);
    final points = context.watch<GameController>().score;

    final body = RefreshIndicator(
      onRefresh: _refresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (_error != null) ...[
            Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
            const SizedBox(height: 12),
          ],
          CircleStatsCard(
            title: 'Class ',
            subtitle: 'Assigned classes you lead, at a glance',
            empty: classes.isEmpty,
            emptyLabel: 'No classes assigned yet',
            stats: [
              CircleStat(
                icon: Icons.school_rounded,
                iconColor: AppColors.orange,
                value: '${classes.length}',
                label: classes.length == 1 ? 'Class' : 'Classes',
              ),
              CircleStat(
                icon: Icons.groups_rounded,
                iconColor: AppColors.teal,
                value: '${classes.length}',
                label: 'Leading',
              ),
              CircleStat(
                icon: Icons.stars_rounded,
                iconColor: AppColors.gold,
                value: '$points',
                label: 'Points',
                emphasize: true,
              ),
            ],
          ),
          const SizedBox(height: 16),
          _yourClassesHeader(),
          const SizedBox(height: 12),
          if (classes.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: AppRadii.cardRadius,
                border: Border.all(color: AppColors.border),
              ),
              child: const Text(
                'No classes assigned yet. Your ministry lead can assign you to a class.',
                style: TextStyle(color: AppColors.textSecondary),
              ),
            )
          else
            ...classes.expand((cls) => [
                  AdventureListCard(
                    key: Key('class-listing-${cls.id}'),
                    title: cls.name,
                    subtitle: 'Class · Members & standing',
                    icon: Icons.groups_rounded,
                    accent: AdventureListCard.accentForKind(cls.kind),
                    onTap: () => _openClass(cls),
                  ),
                  const SizedBox(height: 10),
                ]),
        ],
      ),
    );

    if (widget.embedded) {
      return ColoredBox(color: AppColors.cream, child: body);
    }
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text('Classes', style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: body,
    );
  }
}

/// Full class view: navy hero, members + cheer, standing, Objective Quiz.
class TeacherClassDetailScreen extends StatefulWidget {
  const TeacherClassDetailScreen({super.key, required this.assignedClass});

  final AssignedClass assignedClass;

  @override
  State<TeacherClassDetailScreen> createState() => _TeacherClassDetailScreenState();
}

class _TeacherClassDetailScreenState extends State<TeacherClassDetailScreen> {
  bool _quizBusy = false;
  String? _error;

  AssignedClass get _cls => widget.assignedClass;

  Future<void> _toggleQuiz() async {
    setState(() {
      _quizBusy = true;
      _error = null;
    });
    try {
      final weeksRes = await ServiceLocator.instance.apiClient.dio.get('/api/teen-quest/weeks');
      final weeks = (weeksRes.data as List).cast<Map<String, dynamic>>();
      if (weeks.isEmpty) {
        throw Exception('No published quest weeks yet.');
      }
      final activeRes = await ServiceLocator.instance.apiClient.dio
          .get('/api/teen-quest/class/${_cls.id}/active');
      final active = (activeRes.data as List).cast<Map<String, dynamic>>();
      final activeIds = active
          .where((a) => a['isActive'] == true)
          .map((a) => a['questId'] as String?)
          .whereType<String>()
          .toList();
      final activeQuestId = activeIds.isEmpty ? null : activeIds.first;
      if (!mounted) return;
      String selected = activeQuestId ?? (weeks.first['id'] as String);
      final activate = await showDialog<bool>(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (ctx, setLocal) => AlertDialog(
            title: Text('Objective Quiz · ${_cls.name}'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: selected,
                  items: weeks
                      .map(
                        (w) => DropdownMenuItem(
                          value: w['id'] as String,
                          child: Text('Week ${w['weekNumber']}: ${w['title']}'),
                        ),
                      )
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setLocal(() => selected = v);
                  },
                ),
                const SizedBox(height: 8),
                Text(
                  activeQuestId != null
                      ? 'A quiz is currently active for this class.'
                      : 'No quiz is active for this class.',
                  style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: const Text('Deactivate'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('Activate'),
              ),
            ],
          ),
        ),
      );
      if (activate == null) return;
      await ServiceLocator.instance.apiClient.dio.post(
        '/api/teen-quest/class/${_cls.id}/activate',
        data: {
          'questId': selected,
          'quizType': 'OBJS',
          'isActive': activate,
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(activate ? 'Objective Quiz activated.' : 'Objective Quiz deactivated.'),
          backgroundColor: AppColors.navy,
        ),
      );
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _quizBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cream,
      body: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverToBoxAdapter(
            child: _ClassHeroHeader(
              cls: _cls,
              quizBusy: _quizBusy,
              onQuiz: _quizBusy ? null : _toggleQuiz,
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                if (_error != null) ...[
                  Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A), fontSize: 13)),
                  const SizedBox(height: 12),
                ],
                const Text(
                  'Members',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Teens in this class (first name only). Cheer all members or only the ones you select.',
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
                const SizedBox(height: 12),
                TeacherClassMembers(
                  classId: _cls.id,
                  className: _cls.name,
                ),
                const SizedBox(height: 24),
                const Text(
                  'Your standing',
                  style: TextStyle(
                    fontWeight: FontWeight.w900,
                    fontSize: 16,
                    color: AppColors.navy,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Here is how explorers rank in this class.',
                  style: TextStyle(fontSize: 13, color: AppColors.textMuted),
                ),
                const SizedBox(height: 12),
                GroupStandingBoard(
                  classId: _cls.id,
                  canNudge: true,
                ),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _ClassHeroHeader extends StatelessWidget {
  const _ClassHeroHeader({
    required this.cls,
    required this.quizBusy,
    this.onQuiz,
  });

  final AssignedClass cls;
  final bool quizBusy;
  final VoidCallback? onQuiz;

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top;
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          height: top + 132,
          width: double.infinity,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                AppColors.navy,
                Color(0xFF0A3A5C),
                Color(0xFF0E5A6A),
              ],
            ),
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(8, top + 4, 8, 0),
          child: Row(
            children: [
              IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back_rounded, color: AppColors.cream),
              ),
              const Spacer(),
              TextButton(
                key: Key('class-quiz-${cls.id}'),
                onPressed: onQuiz,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.cream,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
                child: Text(
                  quizBusy ? '…' : 'Quiz',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: EdgeInsets.fromLTRB(20, top + 56, 20, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                width: 88,
                height: 88,
                decoration: BoxDecoration(
                  color: AppColors.orange,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.cream, width: 3),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.navy.withValues(alpha: 0.28),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Icon(Icons.groups_rounded, size: 40, color: AppColors.cream),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cls.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 24,
                          height: 1.15,
                          color: AppColors.cream,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.sageContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text(
                          'Teacher',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: AppColors.forestGreen,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
