import 'package:flutter/material.dart';
import '../../../models/api_models.dart';
import '../../shared/widgets/adventure_list_card.dart';

class CurriculumWeekTile extends StatelessWidget {
  const CurriculumWeekTile({
    super.key,
    required this.week,
    this.onTap,
    this.trailing,
    this.subtitle,
  });

  final TeenQuest week;
  final VoidCallback? onTap;
  final Widget? trailing;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final meta = [
      '${week.videos.length} video${week.videos.length == 1 ? '' : 's'}',
      '${week.biblePortions.length} Bible portion${week.biblePortions.length == 1 ? '' : 's'}',
    ].join(' · ');
    return AdventureListCard(
      title: 'Week ${week.weekNumber}: ${week.title}',
      subtitle: subtitle ?? '${week.scripture} · $meta',
      icon: Icons.menu_book_rounded,
      onTap: onTap,
      accent: AdventureListAccent.navy,
      trailing: trailing,
    );
  }
}
