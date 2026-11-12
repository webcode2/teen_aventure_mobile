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
  /// Set by the panel when this viewer may add a family admin.
  final _addAdmin = ValueNotifier<VoidCallback?>(null);

  @override
  void dispose() {
    _addAdmin.dispose();
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
        title: const Text(
          'Family',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        actions: [
          ValueListenableBuilder<VoidCallback?>(
            valueListenable: _addAdmin,
            builder: (context, action, _) => action == null
                ? const SizedBox.shrink()
                : Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: TextButton.icon(
                      onPressed: action,
                      style: TextButton.styleFrom(foregroundColor: AppColors.cream),
                      icon: const Icon(Icons.person_add_alt_1),
                      label: const Text('Add admin', style: TextStyle(fontWeight: FontWeight.w800)),
                    ),
                  ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: ParentHomePanel(addAdminAction: _addAdmin),
      ),
    );
    return id == null
        ? page
        : Provider.value(value: context.read<FamilyService>().forFamily(id), child: page);
  }
}
