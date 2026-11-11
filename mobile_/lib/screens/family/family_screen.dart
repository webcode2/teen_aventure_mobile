import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/family_service.dart';
import '../../theme.dart';
import '../adult/parent_home_panel.dart';

/// Family management — children and settings.
/// Opened from Profile → Family (moved off the Home tab).
class FamilyScreen extends StatelessWidget {
  const FamilyScreen({super.key, this.familyId});

  final String? familyId;

  @override
  Widget build(BuildContext context) {
    final id = familyId;
    final page = Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: const Text(
          'Family',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
      ),
      body: const SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: ParentHomePanel(),
      ),
    );
    return id == null
        ? page
        : Provider.value(value: context.read<FamilyService>().forFamily(id), child: page);
  }
}
