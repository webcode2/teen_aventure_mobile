import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../providers/cms_text.dart';
import '../../services/content_service.dart';
import '../../theme.dart';
import 'widgets/curriculum_week_tile.dart';
import 'week_lesson_detail_screen.dart';
import 'what_to_learn_screen.dart';
import '../../services/error_text.dart';

class BibleCatalogScreen extends StatefulWidget {
  const BibleCatalogScreen({super.key, this.embedded = false});

  final bool embedded;

  @override
  State<BibleCatalogScreen> createState() => _BibleCatalogScreenState();
}

class _BibleCatalogScreenState extends State<BibleCatalogScreen> {
  List<TeenQuest> _weeks = const [];
  final Set<String> _onPlan = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  CurriculumTrack get _track =>
      context.read<ContentService>().manageTrackFor(context.read<AuthSession>());

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final content = context.read<ContentService>();
      final session = context.read<AuthSession>();
      final weeks = await content.getTeenQuestWeeks();
      final onPlan = <String>{};
      for (final week in weeks) {
        if (await content.isWeekOnPlan(_track, week.id, childId: session.childId)) {
          onPlan.add(week.id);
        }
      }
      if (!mounted) return;
      setState(() {
        _weeks = weeks;
        _onPlan
          ..clear()
          ..addAll(onPlan);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = errorText(e);
        _loading = false;
      });
    }
  }

  String get _blurb {
    final session = context.read<AuthSession>();
    if (session.isParent) {
      return 'Add weeks for home. They stay in catalog order.';
    }
    return 'Add weeks for yourself. Quiz and game unlock after the last video.';
  }

  Future<void> _toggle(TeenQuest week) async {
    final content = context.read<ContentService>();
    final session = context.read<AuthSession>();
    if (_onPlan.contains(week.id)) {
      await content.removeWeekFromPlan(_track, week.id, childId: session.childId);
    } else {
      await content.addWeekToPlan(_track, week.id, childId: session.childId);
    }
    await _load();
  }

  void _openPlan() {
    final route = MaterialPageRoute(builder: (_) => const WhatToLearnScreen());
    if (widget.embedded) {
      Navigator.push(context, route).then((_) => _load());
    } else {
      Navigator.pushReplacement(context, route);
    }
  } 

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!));
    return RefreshIndicator(
      onRefresh: () => Future.wait([_load(), refreshDashboardCopy(context)]),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 28),
        children: [
          const Text('Bible', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppColors.navy)),
          const SizedBox(height: 6),
          Text(_blurb, style: const TextStyle(color: AppColors.textMuted, fontSize: 13)),
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: _openPlan,
              icon: const Icon(Icons.checklist_rtl),
              label: const Text('What to learn'),
            ),
          ),
          const SizedBox(height: 8),
          for (final week in _weeks) ...[
            CurriculumWeekTile(
              week: week,
              onTap: () async {
                await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => WeekLessonDetailScreen(week: week, track: _track)),
                );
                if (mounted) _load();
              },
              trailing: TextButton(
                onPressed: () => _toggle(week),
                child: Text(_onPlan.contains(week.id) ? 'Added' : 'Add'),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final body = ColoredBox(color: AppColors.cream, child: _body());
    if (widget.embedded) return body;
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(title: const Text('Bible')),
      body: _body(),
    );
  }
}
