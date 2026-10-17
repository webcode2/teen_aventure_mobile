import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/api_models.dart';
import '../../services/api_client.dart';
import '../../services/engagement_service.dart';
import '../../services/service_locator.dart';
import '../../theme.dart';
import '../../utils/classroom_name.dart';

/// Roster for a church-assigned teacher: teen members, points, cheer all or selected.
class TeacherClassMembers extends StatefulWidget {
  const TeacherClassMembers({
    super.key,
    required this.classId,
    required this.className,
  });

  final String classId;
  final String className;

  @override
  State<TeacherClassMembers> createState() => _TeacherClassMembersState();
}

class _TeacherClassMembersState extends State<TeacherClassMembers> {
  List<_MemberRow> _rows = const [];
  List<NudgeTemplate> _cheers = const [];
  final Set<String> _selected = {};
  bool _loading = true;
  bool _sending = false;
  String? _error;
  String? _busyEnrollmentId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ServiceLocator.instance.apiClient.dio.get(
        '/api/classes/${widget.classId}/enrollments',
      );
      final raw = (res.data as List).cast<Map<String, dynamic>>();
      final rows = raw.map(_MemberRow.fromJson).toList()
        ..sort((a, b) {
          final byPoints = b.points.compareTo(a.points);
          if (byPoints != 0) return byPoints;
          final status = a.status.compareTo(b.status);
          if (status != 0) return status;
          return a.name.toLowerCase().compareTo(b.name.toLowerCase());
        });
      List<NudgeTemplate> cheers = const [];
      if (!mounted) return;
      try {
        cheers = await context.read<EngagementService>().getNudgeTemplates(
              classId: widget.classId,
            );
      } catch (_) {}
      if (!mounted) return;
      setState(() {
        _rows = rows;
        _cheers = cheers;
        _selected.removeWhere(
          (id) => !rows.any((r) => r.childId == id && r.status == 'APPROVED'),
        );
      });
    } on DioException catch (e) {
      if (mounted) setState(() => _error = ApiException.fromDioError(e).message);
    } catch (e) {
      if (mounted) setState(() => _error = '$e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<_MemberRow> get _approved =>
      _rows.where((r) => r.status == 'APPROVED').toList(growable: false);

  void _toggle(String childId, bool? value) {
    setState(() {
      if (value == true) {
        _selected.add(childId);
      } else {
        _selected.remove(childId);
      }
    });
  }

  void _selectAllApproved() {
    setState(() {
      _selected
        ..clear()
        ..addAll(_approved.map((r) => r.childId));
    });
  }

  Future<String?> _pickCheer({required String title}) async {
    if (_cheers.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No approved cheers available for this class.'),
          backgroundColor: AppColors.navy,
        ),
      );
      return null;
    }
    return showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Text(
                title,
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
              ),
            ),
            ..._cheers.map(
              (t) => ListTile(
                title: Text(t.message),
                onTap: () => Navigator.pop(ctx, t.id),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _cheerAll() async {
    if (_sending) return;
    final templateId = await _pickCheer(title: 'Cheer everyone in ${widget.className}');
    if (templateId == null || !mounted) return;
    setState(() => _sending = true);
    try {
      final count = await context.read<EngagementService>().sendGroupNudge(
            classId: widget.classId,
            templateId: templateId,
          );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            count == 1 ? 'Cheer sent to 1 member' : 'Cheer sent to $count members',
          ),
          backgroundColor: AppColors.navy,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _cheerSelected() async {
    if (_sending || _selected.isEmpty) return;
    final templateId = await _pickCheer(
      title: 'Cheer ${_selected.length} selected member${_selected.length == 1 ? '' : 's'}',
    );
    if (templateId == null || !mounted) return;
    setState(() => _sending = true);
    var ok = 0;
    try {
      final engagement = context.read<EngagementService>();
      for (final childId in _selected.toList()) {
        try {
          await engagement.sendNudge(
            childId: childId,
            templateId: templateId,
            classId: widget.classId,
          );
          ok += 1;
        } catch (_) {}
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ok == 0
                ? 'Could not send cheers'
                : ok == 1
                    ? 'Cheer sent to 1 member'
                    : 'Cheer sent to $ok members',
          ),
          backgroundColor: AppColors.navy,
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _setStatus(String enrollmentId, String status) async {
    setState(() => _busyEnrollmentId = enrollmentId);
    try {
      await ServiceLocator.instance.apiClient.dio.patch(
        '/api/classes/enrollment/$enrollmentId',
        data: {'status': status},
      );
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busyEnrollmentId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const SizedBox(height: 48, child: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
          TextButton(onPressed: _load, child: const Text('Retry')),
        ],
      );
    }

    final cheerReady = !_sending && _cheers.isNotEmpty;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                '${_rows.length} member${_rows.length == 1 ? '' : 's'}',
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
              ),
            ),
            if (_approved.isNotEmpty)
              TextButton(
                onPressed: _sending ? null : _selectAllApproved,
                child: const Text('Select all'),
              ),
          ],
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          alignment: WrapAlignment.end,
          children: [
            OutlinedButton(
              onPressed: cheerReady && _selected.isNotEmpty ? _cheerSelected : null,
              child: Text(
                _selected.isEmpty ? 'Cheer selected' : 'Cheer selected (${_selected.length})',
              ),
            ),
            FilledButton(
              onPressed: cheerReady && _approved.isNotEmpty ? _cheerAll : null,
              child: const Text('Cheer all'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_rows.isEmpty)
          const Text(
            'No members yet. Explorers join with the class code.',
            style: TextStyle(color: AppColors.textMuted),
          )
        else
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: AppColors.border),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                for (var i = 0; i < _rows.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  _MemberTile(
                    row: _rows[i],
                    selected: _selected.contains(_rows[i].childId),
                    busy: _busyEnrollmentId == _rows[i].enrollmentId,
                    onSelected: _rows[i].status == 'APPROVED'
                        ? (v) => _toggle(_rows[i].childId, v)
                        : null,
                    onApprove: _rows[i].status == 'PENDING'
                        ? () => _setStatus(_rows[i].enrollmentId, 'APPROVED')
                        : null,
                    onReject: _rows[i].status == 'PENDING'
                        ? () => _setStatus(_rows[i].enrollmentId, 'REJECTED')
                        : null,
                  ),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _MemberRow {
  const _MemberRow({
    required this.enrollmentId,
    required this.childId,
    required this.name,
    required this.status,
    required this.points,
  });

  final String enrollmentId;
  final String childId;
  final String name;
  final String status;
  final int points;

  factory _MemberRow.fromJson(Map<String, dynamic> json) {
    final child = json['child'] as Map<String, dynamic>? ?? const {};
    final rawPoints = json['points'];
    final points = rawPoints is int
        ? rawPoints
        : rawPoints is num
            ? rawPoints.toInt()
            : int.tryParse('$rawPoints') ?? 0;
    return _MemberRow(
      enrollmentId: json['id'] as String? ?? '',
      childId: (json['childId'] as String?) ?? (child['id'] as String? ?? ''),
      name: classroomFirstName(child['name'] as String?),
      status: json['status'] as String? ?? 'PENDING',
      points: points,
    );
  }
}

class _MemberTile extends StatelessWidget {
  const _MemberTile({
    required this.row,
    required this.selected,
    required this.busy,
    this.onSelected,
    this.onApprove,
    this.onReject,
  });

  final _MemberRow row;
  final bool selected;
  final bool busy;
  final ValueChanged<bool?>? onSelected;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      leading: onSelected == null
          ? const Icon(Icons.person_outline_rounded, color: AppColors.textMuted)
          : Checkbox(value: selected, onChanged: busy ? null : onSelected),
      title: Text(row.name, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.navy)),
      subtitle: Text(row.status, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
      trailing: row.status == 'PENDING'
          ? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextButton(onPressed: busy ? null : onReject, child: const Text('Reject')),
                FilledButton(
                  onPressed: busy ? null : onApprove,
                  child: Text(busy ? '…' : 'Approve'),
                ),
              ],
            )
          : Text(
              '${row.points} pts',
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: AppColors.teal,
              ),
            ),
    );
  }
}
