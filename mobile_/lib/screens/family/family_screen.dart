import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../adult/parent_home_panel.dart';

/// Family management — children and settings.
/// Opened from Profile → Family (moved off the Home tab).
class FamilyScreen extends StatefulWidget {
  const FamilyScreen({super.key, this.familyId});

  final String? familyId;

  @override
  State<FamilyScreen> createState() => _FamilyScreenState();
}

class _FamilyScreenState extends State<FamilyScreen> {
  /// Set by the panel once the family loads: title and the options this viewer may use.
  final _actions = ValueNotifier<FamilyPanelActions?>(null);

  @override
  void dispose() {
    _actions.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final id = widget.familyId;
    final page = Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: ValueListenableBuilder<FamilyPanelActions?>(
          valueListenable: _actions,
          builder: (context, actions, _) => Text(
            actions?.title ?? 'Family',
            style: const TextStyle(fontWeight: FontWeight.w900),
          ),
        ),
        actions: [
          ValueListenableBuilder<FamilyPanelActions?>(
            valueListenable: _actions,
            builder: (context, actions, _) =>
                actions == null ? const SizedBox.shrink() : FamilyOptionsMenu(actions: actions),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: kScreenHorizontalInset, vertical: 16),
        child: ParentHomePanel(actions: _actions),
      ),
    );
    return id == null
        ? page
        : Provider.value(value: context.read<FamilyService>().forFamily(id), child: page);
  }
}

/// The Family screen's ⋮ menu. Items the viewer may not use are left out.
class FamilyOptionsMenu extends StatelessWidget {
  const FamilyOptionsMenu({super.key, required this.actions});

  final FamilyPanelActions actions;

  @override
  Widget build(BuildContext context) {
    final items = <(String, IconData, VoidCallback)>[
      if (actions.addExplorer case final action?) ('Add explorer', Icons.person_add_alt_1, action),
      if (actions.inviteGuardian case final action?) ('Invite to family', Icons.forward_to_inbox_rounded, action),
      if (actions.addGuardian case final action?) ('Add guardian', Icons.shield_outlined, action),
      if (actions.updateFamily case final action?) ('Update family', Icons.edit_outlined, action),
      ('All groups', Icons.groups_rounded, actions.allGroups),
    ];
    return PopupMenuButton<int>(
      key: const ValueKey('family-options'),
      tooltip: 'Family options',
      icon: const Icon(Icons.more_vert, color: AppColors.cream),
      onSelected: (index) => items[index].$3(),
      itemBuilder: (_) => [
        for (final (index, item) in items.indexed)
          PopupMenuItem(
            value: index,
            child: Row(
              children: [
                Icon(item.$2, color: AppColors.navy, size: 20),
                const SizedBox(width: 12),
                Flexible(child: Text(item.$1)),
              ],
            ),
          ),
      ],
    );
  }
}
