import 'dart:math';

import 'package:flutter/cupertino.dart' show CupertinoPicker;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../models/api_models.dart';
import '../auth/auth_chrome.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/engagement_service.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../../family/family_account_rules.dart';
import '../groups/groups_screen.dart';
import '../shared/widgets/adventure_list_card.dart';
import '../../services/error_text.dart';

const _avatarPalette = [
  AppColors.navy,
  AppColors.forestGreen,
  AppColors.orange,
  AppColors.teal,
];

class ParentHomePanel extends StatefulWidget {
  const ParentHomePanel({super.key, this.addAdminAction});

  /// When set, the "Add family admin" action is published here for the host's
  /// top bar (null when the viewer may not add admins) instead of shown inline.
  final ValueNotifier<VoidCallback?>? addAdminAction;

  @override
  State<ParentHomePanel> createState() => _ParentHomePanelState();
}

class _ParentHomePanelState extends State<ParentHomePanel> {
  Map<String, dynamic>? _family;
  FamilySummary? _summary;
  GroupJar? _groupJar;
  List<NudgeTemplate> _cheers = const [];
  String? _error;
  bool _loading = true;
  final _childName = TextEditingController();
  final _childAge = TextEditingController();
  final _teenEmail = TextEditingController();
  final _teenPassword = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _childName.dispose();
    _childAge.dispose();
    _teenEmail.dispose();
    _teenPassword.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final family = context.read<FamilyService>();
      final engagement = context.read<EngagementService>();
      _family = await family.getMyFamily();
      _summary = await engagement.getFamilySummary(familyId: family.familyId);
      try {
        _cheers = await engagement.getNudgeTemplates();
      } catch (_) {
        _cheers = const [];
      }
      try {
        _groupJar = await engagement.getGroupJar();
      } catch (_) {
        _groupJar = null;
      }
    } on ApiException catch (e) {
      if (e.statusCode == 403) {
        _family = null;
        _error = null;
      } else {
        _error = e.message;
      }
    } catch (e) {
      _error = errorText(e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<Map<String, dynamic>> get _children {
    final list = _family?['children'];
    if (list is List) {
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return const [];
  }

  FamilyChildScore? _scoreFor(String id) {
    final matches = _summary?.children.where((c) => c.childId == id) ?? const <FamilyChildScore>[];
    return matches.isEmpty ? null : matches.first;
  }

  Future<void> _ensureOwnedFamily() async {
    final session = context.read<AuthSession>();
    if (_family != null || !session.canCreateGroups || !canCreateOwnedFamily(session.familyId)) return;
    final name = defaultFamilyName(session.displayName);
    await context.read<FamilyService>().createFamily(name);
    await session.refreshProfile();
  }

  Future<void> _addChild() async {
    final name = _childName.text.trim();
    if (name.isEmpty) return;
    final age = int.tryParse(_childAge.text.trim());
    final kind = age == null ? null : explorerKindFromAge(age);
    if (!mounted) return;
    if (age == null || kind == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text(explorerAgeHint)),
      );
      return;
    }

    String? email;
    String? password;
    if (kind == ExplorerAgeKind.teen && _teenEmail.text.trim().isNotEmpty) {
      email = _teenEmail.text.trim();
      password = _teenPassword.text;
      final error = validateEmail(email) ?? validatePassword(password);
      if (error != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        return;
      }
    }

    try {
      await _ensureOwnedFamily();
      if (!mounted) return;
      await context.read<FamilyService>().addChild(
            name: name,
            birthYear: DateTime.now().year - age,
            email: email,
            password: password,
          );
      _childName.clear();
      _childAge.clear();
      _teenEmail.clear();
      _teenPassword.clear();
      if (!mounted) return;
      await context.read<AuthSession>().refreshProfile();
      await _load();
    } on ApiException catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
    }
  }

  Future<void> _editFamily() async {
    final service = context.read<FamilyService>();
    var name = _family?['name'] as String? ?? '';
    var description = _family?['description'] as String? ?? '';
    final form = GlobalKey<FormState>();
    var busy = false;
    String? error;
    final saved = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) => PopScope(
          canPop: !busy,
          child: AlertDialog(
            title: const Text('Edit family'),
            scrollable: true,
            content: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextFormField(
                    initialValue: name,
                    enabled: !busy,
                    maxLength: 100,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    decoration: _fieldDecoration('Family name'),
                    onChanged: (value) => name = value,
                    validator: (value) => value?.trim().isNotEmpty == true
                        ? null
                        : 'Enter a family name',
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    initialValue: description,
                    enabled: !busy,
                    maxLength: 500,
                    minLines: 2,
                    maxLines: 4,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: _fieldDecoration('Description (optional)'),
                    onChanged: (value) => description = value,
                  ),
                  if (error != null)
                    Text(error!, style: TextStyle(color: Theme.of(ctx).colorScheme.error)),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: busy ? null : () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: busy ? null : () async {
                  if (form.currentState?.validate() != true) return;
                  update(() {
                    busy = true;
                    error = null;
                  });
                  try {
                    final details = description.trim();
                    await service.updateMyFamily(
                      name: name.trim(),
                      description: details.isEmpty ? null : details,
                    );
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } catch (e) {
                    if (ctx.mounted) {
                      update(() {
                        busy = false;
                        error = errorText(e);
                      });
                    }
                  }
                },
                child: Text(busy ? 'Saving…' : 'Save'),
              ),
            ],
          ),
        ),
      ),
    );
    if (saved == true && mounted) {
      setState(() {
        _family?['name'] = name.trim();
        _family?['description'] = description.trim();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Family details saved.')),
      );
    }
  }

  Future<void> _addGuardian(Iterable<Map> guardians) async {
    // Family members aged 15+. Adults can be picked; teens are shown but admins must be 20+.
    final members = <_AdminCandidate>[
      for (final guardian in guardians)
        if (guardian['relation'] != 'Owner' && guardian['relation'] != 'Admin')
          if (guardian['user'] case {'email': final String email, 'name': final String name})
            if (email.trim().isNotEmpty && name.trim().isNotEmpty)
              _AdminCandidate(name: name, email: email, note: 'Adult'),
      for (final child in _children)
        if (_ageOf(child) case final int age when age >= 15 && age < 20)
          _AdminCandidate(name: child['name'] as String? ?? 'Explorer', note: 'Teen · admins must be 20+'),
    ];
    final firstEligible = members.indexWhere((member) => member.eligible);
    final service = context.read<FamilyService>();
    final form = GlobalKey<FormState>();
    var selected = firstEligible < 0 ? 0 : firstEligible;
    var busy = false;
    String? error;
    final added = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) => PopScope(
          canPop: !busy,
          child: AlertDialog(
            title: const Text('Add family admin'),
            scrollable: true,
            content: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Family admins can manage the family and its explorers.'),
                  const SizedBox(height: 12),
                  if (members.isEmpty)
                    const Text('No family members aged 15 or over yet.')
                  else ...[
                    const Text(
                      'Choose a family member',
                      style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
                    ),
                    SizedBox(
                      height: 150,
                      child: CupertinoPicker(
                        key: const ValueKey('admin-member-picker'),
                        itemExtent: 48,
                        scrollController: FixedExtentScrollController(initialItem: selected),
                        onSelectedItemChanged: busy ? null : (index) => update(() => selected = index),
                        children: [
                          for (final member in members)
                            Center(
                              child: Text.rich(
                                TextSpan(
                                  text: member.name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w700,
                                    color: member.eligible ? AppColors.navy : AppColors.textMuted,
                                  ),
                                  children: [
                                    TextSpan(
                                      text: '  ${member.note}',
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
                                    ),
                                  ],
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (!members[selected].eligible)
                      Text(
                        'Admins must be 20 or older.',
                        style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                      ),
                  ],
                  if (error != null) ...[
                    const SizedBox(height: 8),
                    Text(error!, style: TextStyle(color: Theme.of(ctx).colorScheme.error)),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: busy ? null : () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: busy || members.isEmpty || !members[selected].eligible ? null : () async {
                  if (form.currentState?.validate() != true) return;
                  update(() {
                    busy = true;
                    error = null;
                  });
                  try {
                    await service.addGuardian(members[selected].email!, asAdmin: true);
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  } catch (e) {
                    if (ctx.mounted) {
                      update(() {
                        busy = false;
                        error = errorText(e);
                      });
                    }
                  }
                },
                child: Text(busy ? 'Adding…' : 'Add family admin'),
              ),
            ],
          ),
        ),
      ),
    );
    if (added == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Family admin added.')),
      );
      await _load();
    }
  }

  Future<void> _changeDependentDeletion(Map child, {bool restore = false}) async {
    var password = '';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(restore ? 'Restore ${child['name']}?' : 'Request deletion of ${child['name']}?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(restore
                ? 'This will make the profile available again.'
                : 'Only this profile is affected. You can restore it for 30 days unless it is archived, in which case contact support. Its data is eligible for permanent deletion after 90 days.'),
            TextField(
              obscureText: true,
              onChanged: (value) => password = value,
              decoration: const InputDecoration(labelText: 'Your account password'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(restore ? 'Restore profile' : 'Request deletion')),
        ],
      ),
    );
    if (confirmed != true || !mounted || password.isEmpty) return;
    final session = context.read<AuthSession>();
    try {
      await context.read<FamilyService>().changeDependentDeletion(child['id'] as String, password, restore: restore);
      if (!mounted) return;
      await _load();
      await session.refreshProfile();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
    }
  }

  Future<void> _setPin(Map<String, dynamic> child) async {
    final form = GlobalKey<FormState>();
    var pin = '';
    var generatedPin = '';
    var generation = 0;
    var visible = false;
    final saved = await showDialog<String>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, update) => AlertDialog(
          title: Text('Set PIN for ${child['name']}'),
          scrollable: true,
          content: Form(
            key: form,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  key: ValueKey(generation),
                  initialValue: generatedPin,
                  keyboardType: TextInputType.number,
                  maxLength: 4,
                  obscureText: !visible,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: (value) => pin = value,
                  validator: (value) => validatePin(value ?? ''),
                  decoration: InputDecoration(
                    labelText: '4-digit PIN',
                    counterText: '',
                    suffixIcon: IconButton(
                      tooltip: visible ? 'Hide PIN' : 'Show PIN',
                      onPressed: () => update(() => visible = !visible),
                      icon: Icon(visible ? Icons.visibility_off : Icons.visibility),
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => update(() {
                    generatedPin = Random.secure().nextInt(10000).toString().padLeft(4, '0');
                    pin = generatedPin;
                    generation++;
                    visible = true;
                  }),
                  icon: const Icon(Icons.autorenew),
                  label: const Text('Generate PIN'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                if (form.currentState?.validate() == true) Navigator.pop(ctx, pin);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (saved == null || !mounted) return;
    try {
      await context.read<AuthService>().setChildPin(
            childId: child['id'] as String,
            pin: saved,
            familyId: context.read<FamilyService>().familyId,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('PIN saved for ${child['name']}'), backgroundColor: AppColors.navy),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
    }
  }

  Future<void> _explorerAccess(Map<String, dynamic> child) async {
    final linked = child['transitionedToUserId'] != null;
    final active = child['independentLogin'] == true;
    final email = TextEditingController(text: child['email'] as String? ?? '');
    final password = TextEditingController();
    final adultEmail = TextEditingController();
    final adultPassword = TextEditingController();
    if (!mounted) return;
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.cream,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.borderDark,
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Sign-in for ${child['name']}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
                ),
                const SizedBox(height: 6),
                const Text(
                  'An email and password let this explorer sign in on their own device.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.35),
                ),
                const SizedBox(height: 16),
                if (!linked) ...[
                  TextField(
                    controller: email,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    textInputAction: TextInputAction.next,
                    decoration: _fieldDecoration('Login email'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: password,
                    obscureText: true,
                    decoration: _fieldDecoration('Password (8+ characters)'),
                  ),
                  const SizedBox(height: 12),
                ],
                FilledButton(
                  onPressed: () async {
                    final pwd = password.text;
                    final pwdError = linked ? null : validateEmail(email.text) ?? validatePassword(pwd);
                    if (pwdError != null) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(pwdError)));
                      }
                      return;
                    }
                    try {
                      await context.read<FamilyService>().enableIndependentLogin(
                            childId: child['id'] as String,
                            enabled: !active,
                            email: linked ? null : email.text.trim(),
                            password: linked ? null : pwd,
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      if (!mounted) return;
                      await context.read<AuthSession>().refreshProfile();
                      if (mounted) await _load();
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
                    }
                  },
                  child: Text(active ? 'Deactivate sign-in' : linked ? 'Reactivate sign-in' : 'Enable sign-in'),
                ),
                if (child['ageBand'] == 'TEEN') ...[
                  const SizedBox(height: 20),
                  const Text(
                    'Age-up',
                    style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: adultEmail,
                    keyboardType: TextInputType.emailAddress,
                    autocorrect: false,
                    textInputAction: TextInputAction.next,
                    decoration: _fieldDecoration('Adult account email'),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: adultPassword,
                    obscureText: true,
                    decoration: _fieldDecoration('Adult password'),
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton(
                    onPressed: () async {
                      try {
                        await context.read<FamilyService>().transitionToAdult(
                              childId: child['id'] as String,
                              email: adultEmail.text.trim(),
                              password: adultPassword.text,
                              name: child['name'] as String?,
                            );
                        if (ctx.mounted) Navigator.pop(ctx);
                        await _load();
                      } catch (e) {
                        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
                      }
                    },
                    child: const Text('Transition to adult account'),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
    email.dispose();
    password.dispose();
    adultEmail.dispose();
    adultPassword.dispose();
  }

  Future<void> _nudge(String childId, String templateId) async {
    try {
      await context.read<EngagementService>().sendNudge(childId: childId, templateId: templateId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cheer sent'), backgroundColor: AppColors.navy),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return _Surface(
        child: Column(
          children: [
            Text(_error!, style: const TextStyle(color: AppColors.navy)),
            const SizedBox(height: 8),
            TextButton(onPressed: _load, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (_family == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _FamilyCircleStats(
            explorers: 0,
            points: 0,
            familyJar: 0,
          ),
          const SizedBox(height: 20),
          const Text(
            'Your family',
            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
          ),
          const SizedBox(height: 6),
          const Text(
            'Only explorers you create under this parent account belong here. No join or invite.',
            style: TextStyle(color: AppColors.textMuted, height: 1.35, fontSize: 13),
          ),
          const SizedBox(height: 16),
          _AddChildCard(
            name: _childName,
            age: _childAge,
            email: _teenEmail,
            password: _teenPassword,
            onAdd: () => _addChild(),
          ),
        ],
      );
    }

    final familyName = _family?['name'] as String? ?? 'Your family';
    final description = (_family?['description'] as String?)?.trim() ?? '';
    final guardians = (_family?['guardians'] as List?)?.whereType<Map>() ?? const [];
    final canManage = _family?['deletionStage'] == null;
    final kids = _children;
    final userId = context.watch<AuthSession>().userId;
    final ownsFamily = userId != null && _family?['ownerUserId'] == userId;
    final canAddAdmin = canManage && (ownsFamily || guardians.any(
      (guardian) => guardian['userId'] == userId && userId != null && guardian['relation'] == 'Admin',
    ));
    final topBarAdmin = widget.addAdminAction;
    if (topBarAdmin != null) {
      final action = canAddAdmin ? () => _addGuardian(guardians) : null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        // Always refresh, so the dialog sees the current guardian list.
        if (mounted) topBarAdmin.value = action;
      });
    }
    final pending = (_family?['dependentDeletions'] as List?) ?? const [];
    final points = _summary?.familyAskScore ?? 0;
    final jar = _summary?.familyJar ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _FamilyCircleStats(
          explorers: kids.length,
          points: points,
          familyJar: jar,
          groupJar: _groupJar?.groupJarTotal,
          contributingFamilies: _groupJar?.contributingFamilies,
        ),
        const SizedBox(height: 20),
        const Text(
          'Your family',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
        ),
        const SizedBox(height: 4),
        const Text(
          'Home circle for explorers on this account.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        const SizedBox(height: 12),
        AdventureListCard(
          title: familyName,
          subtitle: description.isEmpty ? null : description,
          icon: Icons.home_rounded,
          accent: AdventureListAccent.orange,
          trailing: canManage
              ? IconButton(
                  tooltip: 'Edit family',
                  onPressed: _editFamily,
                  icon: const Icon(Icons.edit_outlined),
                )
              : null,
        ),
        if (guardians.isNotEmpty || canAddAdmin) ...[
          const SizedBox(height: 20),
          Row(
            children: [
              const Expanded(
                child: Text(
                  'Guardians',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
                ),
              ),
              Text(
                '${guardians.length}',
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Adults who look after this family.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 12),
          if (guardians.isNotEmpty)
            _Surface(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              child: Column(
                children: [
                  for (final (index, guardian) in guardians.indexed) ...[
                    if (index > 0) const Divider(height: 1, color: AppColors.border),
                    if (guardian['user'] case final Map user)
                      _GuardianRow(
                        name: user['name'] as String? ?? user['email'] as String? ?? 'Guardian',
                        relation: guardian['relation'] as String? ?? 'Guardian',
                        isYou: user['id'] != null && user['id'] == userId,
                      ),
                  ],
                ],
              ),
            ),
          if (canAddAdmin && topBarAdmin == null)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: OutlinedButton.icon(
                onPressed: () => _addGuardian(guardians),
                icon: const Icon(Icons.person_add_alt_1),
                label: const Text('Add family admin'),
              ),
            ),
        ],
        if (_family?['deletionStage'] == 'recoverable') ...[
          const SizedBox(height: 12),
          _RestoreBanner(
            onRestore: () async {
              try {
                await context.read<FamilyService>().cancelDeletion();
                await _load();
              } catch (e) {
                if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorText(e))));
              }
            },
          ),
        ],
        const SizedBox(height: 24),
        Row(
          children: [
            const Expanded(
              child: Text(
                'Explorers',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
              ),
            ),
            Text(
              '${kids.length}',
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textMuted),
            ),
          ],
        ),
        const SizedBox(height: 4),
        const Text(
          'Created under this parent account only.',
          style: TextStyle(color: AppColors.textMuted, fontSize: 12),
        ),
        const SizedBox(height: 12),
        if (kids.isEmpty)
          const _Surface(
            child: Text(
              'Add a child to start cheering them on.',
              style: TextStyle(color: AppColors.textSecondary),
            ),
          )
        else
          for (var i = 0; i < kids.length; i++) ...[
            _ChildCard(
              child: kids[i],
              color: _avatarPalette[i % _avatarPalette.length],
              askScore: _scoreFor(kids[i]['id'] as String)?.askScore ?? 0,
              streakDays: _scoreFor(kids[i]['id'] as String)?.streak ?? 0,
              cheers: _cheers,
              onCheer: (key) => _nudge(kids[i]['id'] as String, key),
              onPin: kids[i]['independentLogin'] != true && kids[i]['transitionedToUserId'] == null
                  ? () => _setPin(kids[i])
                  : null,
              onManageTeen: canManage && kids[i]['canManageLogin'] != false
                  ? () => _explorerAccess(kids[i])
                  : null,
              onRequestDeletion: ownsFamily && kids[i]['independentLogin'] != true && kids[i]['transitionedToUserId'] == null
                  ? () => _changeDependentDeletion(kids[i])
                  : null,
            ),
            const SizedBox(height: 12),
          ],
        if (ownsFamily)
          for (final child in pending.whereType<Map>())
            ListTile(
              title: Text('${child['name']} · Deletion requested'),
              trailing: TextButton(onPressed: () => _changeDependentDeletion(child, restore: true), child: const Text('Restore')),
            ),
        const SizedBox(height: 8),
        _AddChildCard(
          name: _childName,
          age: _childAge,
          email: _teenEmail,
          password: _teenPassword,
          onAdd: () => _addChild(),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: () {
            Navigator.push(context, MaterialPageRoute(builder: (_) => const GroupsScreen(showRanks: true)));
          },
          child: const Text('View all groups'),
        ),
      ],
    );
  }
}

InputDecoration _fieldDecoration(String label) {
  return InputDecoration(
    labelText: label,
    filled: true,
    fillColor: Colors.white,
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.border)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: AppColors.navy, width: 1.4)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
  );
}

class _Surface extends StatelessWidget {
  const _Surface({required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}

class _FamilyCircleStats extends StatelessWidget {
  const _FamilyCircleStats({
    required this.explorers,
    required this.points,
    required this.familyJar,
    this.groupJar,
    this.contributingFamilies,
  });

  final int explorers;
  final int points;
  final int familyJar;
  final int? groupJar;
  final int? contributingFamilies;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
                colors: [
                  Color(0xFFFFE4C8),
                  Color(0xFFFFF1E0),
                  Color(0xFFE6F6F6),
                ],
              ),
            ),
            child: const Row(
              children: [
                _StatsHeaderIcon(),
                SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Your family circle',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 14,
                          color: AppColors.navy,
                          letterSpacing: -0.2,
                        ),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Explorers and points on this parent account',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(8, 14, 8, 16),
            child: Row(
              children: [
                Expanded(
                  child: _CircleStatCell(
                    icon: Icons.child_care_rounded,
                    iconColor: AppColors.orange,
                    value: '$explorers',
                    label: 'Explorers',
                  ),
                ),
                Container(width: 1, height: 48, color: AppColors.border),
                Expanded(
                  child: _CircleStatCell(
                    icon: Icons.star_rounded,
                    iconColor: AppColors.gold,
                    value: '$points',
                    label: 'Points',
                  ),
                ),
                Container(width: 1, height: 48, color: AppColors.border),
                Expanded(
                  child: _CircleStatCell(
                    icon: Icons.savings_outlined,
                    iconColor: AppColors.teal,
                    value: '$familyJar',
                    label: 'Family Points',
                  ),
                ),
              ],
            ),
          ),
          if (groupJar != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
              child: Text(
                contributingFamilies == null
                    ? 'Group points: $groupJar pts'
                    : 'Group points $groupJar pts · $contributingFamilies families contributing',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatsHeaderIcon extends StatelessWidget {
  const _StatsHeaderIcon();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: AppColors.orange.withValues(alpha: 0.18),
        shape: BoxShape.circle,
      ),
      child: const Icon(Icons.insights_rounded, size: 20, color: AppColors.orange),
    );
  }
}

class _CircleStatCell extends StatelessWidget {
  const _CircleStatCell({
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: iconColor, size: 22),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: AppColors.navy),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted),
        ),
      ],
    );
  }
}

class _ChildCard extends StatelessWidget {
  const _ChildCard({
    required this.child,
    required this.color,
    required this.onCheer,
    this.cheers = const [],
    this.onPin,
    this.onManageTeen,
    this.onRequestDeletion,
    this.askScore = 0,
    this.streakDays = 0,
  });

  final Map<String, dynamic> child;
  final Color color;
  final ValueChanged<String> onCheer;
  final List<NudgeTemplate> cheers;
  final VoidCallback? onPin;
  final VoidCallback? onManageTeen;
  final VoidCallback? onRequestDeletion;
  final int askScore;
  final int streakDays;

  Future<void> _pickCheer(BuildContext context) async {
    final id = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: Text('Send cheers to ${child['name'] ?? 'explorer'}'),
        children: [
          for (final n in cheers)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(ctx, n.id),
              child: Text(n.message),
            ),
        ],
      ),
    );
    if (id != null) onCheer(id);
  }

  void _onAction(BuildContext context, _ExplorerAction action) {
    switch (action) {
      case _ExplorerAction.cheer:
        _pickCheer(context);
      case _ExplorerAction.pin:
        onPin?.call();
      case _ExplorerAction.access:
        onManageTeen?.call();
      case _ExplorerAction.delete:
        onRequestDeletion?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    final name = child['name'] as String? ?? 'Explorer';
    final ageBand = child['ageBand'] as String? ?? 'CHILD';
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();
    final ageLabel = ageBand == 'TEEN' ? 'Teen' : 'Explorer';

    return _Surface(
      padding: const EdgeInsets.fromLTRB(14, 14, 10, 12),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: color,
                child: Text(
                  initial,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.navy),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: AppColors.cream,
                        borderRadius: BorderRadius.circular(99),
                      ),
                      child: Text(
                        ageLabel,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textSecondary),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '$askScore pts · $streakDays day streak',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ),
              PopupMenuButton<_ExplorerAction>(
                tooltip: 'Options for $name',
                icon: const Icon(Icons.more_vert, color: AppColors.navy),
                onSelected: (action) => _onAction(context, action),
                itemBuilder: (_) => [
                  if (cheers.isNotEmpty)
                    const PopupMenuItem(
                      value: _ExplorerAction.cheer,
                      child: _MenuRow(icon: Icons.favorite_outline, label: 'Send cheers'),
                    ),
                  if (onPin != null)
                    const PopupMenuItem(
                      value: _ExplorerAction.pin,
                      child: _MenuRow(icon: Icons.pin, label: 'Set PIN'),
                    ),
                  if (onManageTeen != null)
                    const PopupMenuItem(
                      value: _ExplorerAction.access,
                      child: _MenuRow(icon: Icons.manage_accounts_outlined, label: 'Access'),
                    ),
                  if (onRequestDeletion != null) ...[
                    const PopupMenuDivider(),
                    const PopupMenuItem(
                      value: _ExplorerAction.delete,
                      child: _MenuRow(icon: Icons.delete_outline, label: 'Request deletion', danger: true),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

enum _ExplorerAction { cheer, pin, access, delete }

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.icon, required this.label, this.danger = false});

  final IconData icon;
  final String label;
  final bool danger;

  @override
  Widget build(BuildContext context) {
    final color = danger ? Theme.of(context).colorScheme.error : AppColors.navy;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 20, color: color),
        const SizedBox(width: 12),
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontWeight: FontWeight.w700, color: color),
          ),
        ),
      ],
    );
  }
}

class _AddChildCard extends StatefulWidget {
  const _AddChildCard({
    required this.name,
    required this.age,
    required this.email,
    required this.password,
    required this.onAdd,
  });

  final TextEditingController name;
  final TextEditingController age;
  final TextEditingController email;
  final TextEditingController password;
  final VoidCallback onAdd;

  @override
  State<_AddChildCard> createState() => _AddChildCardState();
}

class _AddChildCardState extends State<_AddChildCard> {
  /// 0 = name, 1 = age, 2 = email/password (15+ only)
  int _step = 0;

  void _resetSteps() {
    setState(() => _step = 0);
  }

  void _next() {
    if (_step == 0) {
      if (widget.name.text.trim().isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a name for this explorer.')),
        );
        return;
      }
      setState(() => _step = 1);
      return;
    }

    if (_step == 1) {
      final age = int.tryParse(widget.age.text.trim());
      final kind = age == null ? null : explorerKindFromAge(age);
      if (kind == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text(explorerAgeHint)),
        );
        return;
      }
      FocusScope.of(context).unfocus();
      if (kind == ExplorerAgeKind.child) {
        widget.onAdd();
        _resetSteps();
        return;
      }
      setState(() => _step = 2);
      return;
    }

    // Step 3: email + password for 15+
    widget.onAdd();
    // Parent clears fields on success; reset step after a short delay isn't needed —
    // if validation fails fields stay. Reset step when fields are cleared.
    if (widget.name.text.trim().isEmpty) _resetSteps();
  }

  void _back() {
    if (_step > 0) setState(() => _step -= 1);
  }

  @override
  Widget build(BuildContext context) {
    // If parent cleared controllers after success, snap back to step 0.
    if (_step != 0 && widget.name.text.isEmpty && widget.age.text.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && _step != 0) setState(() => _step = 0);
      });
    }


    return _Surface(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Add an explorer',
            style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
          ),
          const SizedBox(height: 6),
          Text(
            _step == 0
                ? 'Step 1 — name'
                : _step == 1
                    ? 'Step 2 — age'
                    : 'Step 3 — optional login (ages 15+)',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35),
          ),
          const SizedBox(height: 14),
          if (_step == 0) ...[
            TextField(
              controller: widget.name,
              decoration: _fieldDecoration('Child/teen name'),
              textCapitalization: TextCapitalization.words,
              onSubmitted: (_) => _next(),
            ),
          ] else if (_step == 1) ...[
            Text(
              widget.name.text.trim(),
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            const SizedBox(height: 10),
            TextField(
              key: const ValueKey('explorer-age'),
              controller: widget.age,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: _fieldDecoration('Age'),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _next(),
            ),
            const SizedBox(height: 8),
            const Text(
              'Ages 0–14 stay under your account. Ages 15–19 can have their own login with email and password. Ages 20+ need their own adult account.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35),
            ),
          ] else ...[
            Text(
              '${widget.name.text.trim()} · age ${widget.age.text.trim()}',
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            const SizedBox(height: 10),
            TextField(
              key: const ValueKey('explorer-email'),
              controller: widget.email,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              textInputAction: TextInputAction.next,
              decoration: _fieldDecoration('Email (optional)'),
              onChanged: (_) => setState(() {}),
            ),
            if (widget.email.text.trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              TextField(
                controller: widget.password,
                obscureText: true,
                decoration: _fieldDecoration('Password (8+ characters)'),
              ),
            ],
            const SizedBox(height: 8),
            const Text(
              'Leave email blank to use a PIN on your device. Set the PIN after creating the explorer.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35),
            ),
          ],
          const SizedBox(height: 14),
          Row(
            children: [
              if (_step > 0) ...[
                Expanded(
                  child: OutlinedButton(
                    onPressed: _back,
                    child: const Text('Back'),
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                flex: _step > 0 ? 1 : 1,
                child: FilledButton(
                  onPressed: _next,
                  child: Text(
                    () {
                      if (_step == 0) return 'Next';
                      if (_step == 1) {
                        final age = int.tryParse(widget.age.text.trim());
                        final kind = age == null ? null : explorerKindFromAge(age);
                        if (kind == ExplorerAgeKind.child) return 'Create explorer';
                        return 'Next';
                      }
                      return widget.email.text.trim().isEmpty ? 'Create explorer' : 'Create with login';
                    }(),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RestoreBanner extends StatelessWidget {
  const _RestoreBanner({required this.onRestore});

  final VoidCallback onRestore;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF4DC),
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.orange.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          const Icon(Icons.restore, color: AppColors.orange),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Deletion is recoverable for 0–30 days.',
              style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.navy, fontSize: 13),
            ),
          ),
          TextButton(onPressed: onRestore, child: const Text('Restore')),
        ],
      ),
    );
  }
}

/// One row in the family-admin picker.
class _AdminCandidate {
  const _AdminCandidate({required this.name, this.email, required this.note});

  final String name;
  /// Set for adult accounts; teens have none and cannot be picked.
  final String? email;
  final String note;

  bool get eligible => email != null;
}

/// Age this year from an explorer's birth year, or null when unknown.
int? _ageOf(Map<String, dynamic> child) {
  final birthYear = child['birthYear'];
  return birthYear is int ? DateTime.now().year - birthYear : null;
}

/// One guardian in the Guardians card: initial avatar, name and a role badge.
class _GuardianRow extends StatelessWidget {
  const _GuardianRow({required this.name, required this.relation, this.isYou = false});

  final String name;
  final String relation;
  final bool isYou;

  @override
  Widget build(BuildContext context) {
    final (badgeBg, badgeFg, icon) = switch (relation) {
      'Owner' => (AppColors.navy, Colors.white, Icons.star_rounded),
      'Admin' => (AppColors.teal.withValues(alpha: 0.14), AppColors.teal, Icons.shield_outlined),
      _ => (AppColors.cream, AppColors.textSecondary, Icons.person_outline),
    };
    final initial = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: relation == 'Owner' ? AppColors.orange : AppColors.forestGreen,
            child: Text(
              initial,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(
              TextSpan(
                text: name,
                children: [
                  if (isYou)
                    const TextSpan(
                      text: '  (you)',
                      style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textMuted, fontSize: 13),
                    ),
                ],
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.navy),
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(99)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, size: 14, color: badgeFg),
                const SizedBox(width: 4),
                Text(
                  relation,
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: badgeFg),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
