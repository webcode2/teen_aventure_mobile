import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../../services/error_text.dart';

/// Shared report form used across the app (groups, profile, etc.).
class ReportIssueScreen extends StatefulWidget {
  const ReportIssueScreen({
    super.key,
    this.targetType,
    this.targetId,
    this.targetName,
    this.canReportToChurch = false,
  });

  final String? targetType;
  final String? targetId;
  final String? targetName;

  /// When true, user can send the report to the ministry (church must respond)
  /// or keep it confidential with Teen Bible Adventures only.
  final bool canReportToChurch;

  @override
  State<ReportIssueScreen> createState() => _ReportIssueScreenState();
}

class _ReportIssueScreenState extends State<ReportIssueScreen> {
  final _message = TextEditingController();
  final _followUpEmail = TextEditingController();
  bool _anonymous = false;
  bool _wantFollowUp = false;
  bool _sending = false;
  bool _seededEmail = false;
  /// app = confidential to operators; church = ministry + operators.
  late String _destination;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Prefer ministry response when the target is church-linked.
    _destination = widget.canReportToChurch ? 'church' : 'app';
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_seededEmail) return;
    _seededEmail = true;
    final email = context.read<AuthSession>().email?.trim();
    if (email != null && email.isNotEmpty) {
      _followUpEmail.text = email;
    }
  }

  @override
  void dispose() {
    _message.dispose();
    _followUpEmail.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final body = _message.text.trim();
    if (body.isEmpty) {
      setState(() => _error = 'Describe what happened');
      return;
    }
    final followUp = _wantFollowUp ? _followUpEmail.text.trim() : null;
    if (_wantFollowUp && (followUp == null || followUp.isEmpty || !followUp.contains('@'))) {
      setState(() => _error = 'Enter a valid follow-up email');
      return;
    }

    setState(() {
      _sending = true;
      _error = null;
    });

    final session = context.read<AuthSession>();
    try {
      await context.read<FamilyService>().submitAppReport(
            message: body,
            anonymous: _anonymous,
            destination: widget.canReportToChurch ? _destination : 'app',
            followUpEmail: followUp,
            targetType: widget.targetType,
            targetId: widget.targetId,
            targetName: widget.targetName,
            reporterId: session.userId ?? session.childId,
            reporterName: session.displayName,
            reporterEmail: session.email,
            reporterChildId: session.childId,
            reporterFamilyId: session.familyId,
          );
      if (!mounted) return;
      final thanks = _destination == 'church' && widget.canReportToChurch
          ? 'Report sent. Your ministry will respond, and Teen Bible Adventures can also review it.'
          : 'Report sent to Teen Bible Adventures. Thank you for speaking up.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(thanks), backgroundColor: AppColors.navy),
      );
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = errorText(e);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final about = widget.targetName?.trim().isNotEmpty == true
        ? 'About ${widget.targetName}'
        : 'Tell us what happened';
    final showDestination = widget.canReportToChurch;

    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text('Report an issue', style: TextStyle(fontWeight: FontWeight.w900)),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 28),
        children: [
          Text(
            about,
            style: const TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: 16,
              color: AppColors.navy,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            showDestination
                ? 'Choose who should receive this report.'
                : 'Reports go to the Teen Bible Adventures app team. Group admins do not see who filed a report.',
            style: const TextStyle(color: AppColors.textSecondary, height: 1.35),
          ),
          if (showDestination) ...[
            const SizedBox(height: 16),
            const Text(
              'Send to',
              style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(
                  value: 'church',
                  label: Text('Church'),
                  icon: Icon(Icons.account_balance_rounded, size: 18),
                ),
                ButtonSegment(
                  value: 'app',
                  label: Text('App team'),
                  icon: Icon(Icons.shield_rounded, size: 18),
                ),
              ],
              selected: {_destination},
              onSelectionChanged: _sending
                  ? null
                  : (next) => setState(() => _destination = next.first),
            ),
            const SizedBox(height: 10),
            Text(
              _destination == 'church'
                  ? 'Your ministry must respond. Teen Bible Adventures admins can also see this report.'
                  : 'Confidential. Only Teen Bible Adventures can see this — your church cannot.',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.35),
            ),
          ],
          const SizedBox(height: 16),
          TextField(
            key: const Key('report-message'),
            controller: _message,
            maxLines: 6,
            decoration: const InputDecoration(
              labelText: 'What happened?',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          SwitchListTile(
            key: const Key('report-anonymous'),
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'Report anonymously',
              style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            subtitle: Text(
              _destination == 'church' && showDestination
                  ? 'Your name stays hidden from the ministry. App administrators keep a safety link when possible.'
                  : 'Your name stays hidden in the public report. App administrators still keep your account link for safety.',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.35),
            ),
            value: _anonymous,
            onChanged: _sending ? null : (value) => setState(() => _anonymous = value),
          ),
          SwitchListTile(
            key: const Key('report-want-follow-up'),
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'I want a follow-up',
              style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            subtitle: const Text(
              'Optional. Add an email if you want the app team to reply.',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted, height: 1.35),
            ),
            value: _wantFollowUp,
            onChanged: _sending
                ? null
                : (value) => setState(() {
                      _wantFollowUp = value;
                    }),
          ),
          if (_wantFollowUp) ...[
            const SizedBox(height: 4),
            TextField(
              key: const Key('report-follow-up-email'),
              controller: _followUpEmail,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(
                labelText: 'Follow-up email',
              ),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: Color(0xFFBA1A1A))),
          ],
          const SizedBox(height: 20),
          FilledButton(
            key: const Key('report-submit'),
            onPressed: _sending ? null : _submit,
            child: Text(_sending ? 'Sending…' : 'Send report'),
          ),
        ],
      ),
    );
  }
}
