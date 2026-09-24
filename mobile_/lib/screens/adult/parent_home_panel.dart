import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../nudge_copy.dart';
import '../auth/auth_chrome.dart';
import '../../services/api_client.dart';
import '../../services/auth_service.dart';
import '../../services/engagement_service.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../../family/family_account_rules.dart';
import '../groups/groups_screen.dart';
import '../shared/widgets/adventure_list_card.dart';

final predefinedNudges = nudgeMessages.entries.map((e) => (e.key, e.value)).toList();

const _avatarPalette = [
  AppColors.navy,
  AppColors.forestGreen,
  AppColors.orange,
  AppColors.teal,
];

class ParentHomePanel extends StatefulWidget {
  const ParentHomePanel({super.key});

  @override
  State<ParentHomePanel> createState() => _ParentHomePanelState();
}

class _ParentHomePanelState extends State<ParentHomePanel> {
  Map<String, dynamic>? _family;
  FamilySummary? _summary;
  GroupJar? _groupJar;
  String? _error;
  bool _loading = true;
  final _childName = TextEditingController();
  final _childAge = TextEditingController();
  final _teenEmail = TextEditingController();
  final _teenPin = TextEditingController();

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
    _teenPin.dispose();
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
      _summary = await engagement.getFamilySummary();
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
      _error = e.toString();
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
    if (!canCreateOwnedFamily(session.familyId)) return;
    final name = defaultFamilyName(session.displayName);
    await context.read<FamilyService>().createFamily(name);
    await session.refreshProfile();
  }

  Future<void> _addChild({bool allowWithoutEmail = false}) async {
    final name = _childName.text.trim();
    if (name.isEmpty) return;
    final age = int.tryParse(_childAge.text.trim());
    final kind = age == null ? null : explorerKindFromAge(age);
    if (!mounted) return;
    if (kind == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter an age from 0 to 25.')),
      );
      return;
    }

    String? email;
    String? pin;
    var independent = false;

    if (kind == ExplorerAgeKind.teen) {
      email = _teenEmail.text.trim();
      pin = _teenPin.text.trim();
      if (email.isEmpty) {
        if (!allowWithoutEmail) {
          final proceed = await showDialog<bool>(
            context: context,
            builder: (ctx) => AlertDialog(
              title: const Text('Continue without email?'),
              content: Text(
                () {
                  final typed = _childName.text.trim();
                  final who = typed.isEmpty ? 'This explorer' : typed;
                  return 'Without an email, $who stays under your account and will not receive an independent Teen login.\n\n'
                      'You can add login details later from Access.';
                }(),
              ),
              actions: [
                TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Go back')),
                FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Continue')),
              ],
            ),
          );
          if (proceed != true || !mounted) return;
        }
      } else {
        final emailError = validateEmail(email);
        final pinError = validatePin(pin);
        if (emailError != null || pinError != null) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(emailError ?? pinError ?? 'Email and PIN required for independent login')),
          );
          return;
        }
        independent = true;
      }
    }

    try {
      await _ensureOwnedFamily();
      if (!mounted) return;
      final created = await context.read<FamilyService>().addChild(
            name: name,
            // Teens without email still use TEEN label but stay on parent account.
            ageBand: kind == ExplorerAgeKind.teen ? 'TEEN' : 'CHILD',
          );
      final childId = created['id'] as String?;
      if (independent && childId != null) {
        if (!mounted) return;
        await context.read<FamilyService>().enableIndependentLogin(
              childId: childId,
              enabled: true,
              email: email,
              pin: pin,
            );
      }
      _childName.clear();
      _childAge.clear();
      _teenEmail.clear();
      _teenPin.clear();
      await context.read<AuthSession>().refreshProfile();
      await _load();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    }
  }

  Future<void> _setPin(Map<String, dynamic> child) async {
    final pin = TextEditingController();
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('Set PIN for ${child['name']}'),
          content: TextField(
            controller: pin,
            keyboardType: TextInputType.number,
            maxLength: 4,
            obscureText: true,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: '4-digit PIN',
              counterText: '',
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
          ],
        );
      },
    );
    if (saved != true) {
      pin.dispose();
      return;
    }
    final error = validatePin(pin.text);
    if (error != null) {
      pin.dispose();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
      return;
    }
    try {
      await context.read<AuthService>().setChildPin(
            childId: child['id'] as String,
            pin: pin.text,
          );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('PIN saved for ${child['name']}'), backgroundColor: AppColors.navy),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      pin.dispose();
    }
  }

  Future<void> _teenActions(Map<String, dynamic> child) async {
    final email = TextEditingController(text: child['email'] as String? ?? '');
    final pin = TextEditingController();
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
                  'Teen access for ${child['name']}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.navy),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Set an independent login, or move them to an adult account when they age up.',
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.35),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: email,
                  decoration: _fieldDecoration('Teen login email'),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: pin,
                  obscureText: true,
                  decoration: _fieldDecoration('4-digit PIN'),
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () async {
                    try {
                      await context.read<FamilyService>().enableIndependentLogin(
                            childId: child['id'] as String,
                            enabled: true,
                            email: email.text.trim(),
                            pin: pin.text.trim().length == 4 ? pin.text.trim() : null,
                          );
                      if (ctx.mounted) Navigator.pop(ctx);
                      await _load();
                    } catch (e) {
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                    }
                  },
                  child: const Text('Enable independent login'),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Age-up',
                  style: TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
                ),
                const SizedBox(height: 8),
                TextField(controller: adultEmail, decoration: _fieldDecoration('Adult account email')),
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
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
                    }
                  },
                  child: const Text('Transition to adult account'),
                ),
              ],
            ),
          ),
        );
      },
    );
    email.dispose();
    pin.dispose();
    adultEmail.dispose();
    adultPassword.dispose();
  }

  Future<void> _nudge(String childId, String key) async {
    try {
      await context.read<EngagementService>().sendNudge(childId: childId, stickerKey: key);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cheer sent'), backgroundColor: AppColors.navy),
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
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
          _FamilyCircleStats(
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
            pin: _teenPin,
            onAdd: () => _addChild(),
          ),
        ],
      );
    }

    final familyName = _family?['name'] as String? ?? 'Your family';
    final kids = _children;
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
          subtitle: 'Family · Standing',
          icon: Icons.home_rounded,
          accent: AdventureListAccent.orange,
          onTap: null,
        ),
        if (_family?['deletionStage'] == 'recoverable') ...[
          const SizedBox(height: 12),
          _RestoreBanner(
            onRestore: () async {
              try {
                await context.read<FamilyService>().cancelDeletion();
                await _load();
              } catch (e) {
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
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
              onCheer: (key) => _nudge(kids[i]['id'] as String, key),
              onPin: () => _setPin(kids[i]),
              onManageTeen: kids[i]['ageBand'] == 'TEEN' && kids[i]['transitionedToUserId'] == null
                  ? () => _teenActions(kids[i])
                  : null,
            ),
            const SizedBox(height: 12),
          ],
        const SizedBox(height: 8),
        _AddChildCard(
          name: _childName,
          age: _childAge,
          email: _teenEmail,
          pin: _teenPin,
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
    required this.onPin,
    this.onManageTeen,
    this.askScore = 0,
    this.streakDays = 0,
  });

  final Map<String, dynamic> child;
  final Color color;
  final ValueChanged<String> onCheer;
  final VoidCallback onPin;
  final VoidCallback? onManageTeen;
  final int askScore;
  final int streakDays;

  @override
  Widget build(BuildContext context) {
    final name = child['name'] as String? ?? 'Explorer';
    final ageBand = child['ageBand'] as String? ?? 'CHILD';
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();
    final ageLabel = ageBand == 'TEEN' ? 'Teen' : 'Under-age';

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
            ],
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              PopupMenuButton<String>(
                onSelected: onCheer,
                itemBuilder: (_) => [
                  for (final n in predefinedNudges)
                    PopupMenuItem(value: n.$1, child: Text(n.$2)),
                ],
                child: const _MiniAction(
                  icon: Icons.favorite_outline,
                  label: 'Send cheers',
                  emphasized: true,
                ),
              ),
              _MiniAction(
                icon: Icons.pin,
                label: 'Set PIN',
                onTap: onPin,
              ),
              if (onManageTeen != null)
                _MiniAction(
                  icon: Icons.manage_accounts_outlined,
                  label: 'Access',
                  onTap: onManageTeen,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MiniAction extends StatelessWidget {
  const _MiniAction({
    required this.icon,
    required this.label,
    this.onTap,
    this.emphasized = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final bg = emphasized ? AppColors.terracottaContainer : Colors.white;
    final fg = emphasized ? AppColors.orange : AppColors.navy;
    final border = emphasized ? AppColors.orange.withValues(alpha: 0.45) : AppColors.borderDark;

    final child = Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.navy.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: fg),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: fg),
          ),
        ],
      ),
    );

    if (onTap == null) return child;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: child,
      ),
    );
  }
}

class _AddChildCard extends StatefulWidget {
  const _AddChildCard({
    required this.name,
    required this.age,
    required this.email,
    required this.pin,
    required this.onAdd,
  });

  final TextEditingController name;
  final TextEditingController age;
  final TextEditingController email;
  final TextEditingController pin;
  final VoidCallback onAdd;

  @override
  State<_AddChildCard> createState() => _AddChildCardState();
}

class _AddChildCardState extends State<_AddChildCard> {
  /// 0 = name, 1 = age, 2 = email/pin (15+ only)
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
          const SnackBar(content: Text('Enter an age from 0 to 25.')),
        );
        return;
      }
      if (kind == ExplorerAgeKind.child) {
        widget.onAdd();
        _resetSteps();
        return;
      }
      setState(() => _step = 2);
      return;
    }

    // Step 2: optional email for 15+
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

    final emailFilled = widget.email.text.trim().isNotEmpty;

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
                ? 'Step 1 of 2 — name'
                : _step == 1
                    ? 'Step 2 of 2 — age'
                    : 'Optional — independent login for ages 15+',
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
              controller: widget.age,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: _fieldDecoration('Age'),
              onChanged: (_) => setState(() {}),
              onSubmitted: (_) => _next(),
            ),
            const SizedBox(height: 8),
            const Text(
              'Ages 0–14 stay under your account. Ages 15+ can use an independent login, or remain under your account if email is skipped.',
              style: TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35),
            ),
          ] else ...[
            Text(
              '${widget.name.text.trim()} · age ${widget.age.text.trim()}',
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: widget.email,
              keyboardType: TextInputType.emailAddress,
              decoration: _fieldDecoration('Email (optional)'),
              onChanged: (_) => setState(() {}),
            ),
            if (emailFilled) ...[
              const SizedBox(height: 10),
              TextField(
                controller: widget.pin,
                obscureText: true,
                keyboardType: TextInputType.number,
                maxLength: 4,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: _fieldDecoration('4-digit PIN').copyWith(counterText: ''),
              ),
            ] else ...[
              const SizedBox(height: 8),
              Text(
                () {
                  final typed = widget.name.text.trim();
                  final who = typed.isEmpty ? 'this explorer' : typed;
                  return 'Skip email to keep $who under your account.';
                }(),
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12, height: 1.35),
              ),
            ],
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
                      return emailFilled ? 'Create with login' : 'Create without email';
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
