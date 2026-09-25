import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../data/episodes.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../theme.dart';
import '../family/family_screen.dart';
import '../groups/join_invite_screen.dart';
import 'widgets/explorer_hero.dart';
import 'widgets/todays_quest_card.dart';
import 'widgets/word_declaration_card.dart';
import 'week_quest_flow.dart';

class ExplorerHomeTab extends StatefulWidget {
  const ExplorerHomeTab({super.key});

  @override
  State<ExplorerHomeTab> createState() => _ExplorerHomeTabState();
}

class _ExplorerHomeTabState extends State<ExplorerHomeTab> {
  static const String questSubtitle = 'Be Strong and Courageous';
  static const double sidePadding = 16;

  AuthSession? get _session {
    try {
      return context.watch<AuthSession>();
    } catch (_) {
      return null;
    }
  }

  bool get _isAdult => _session?.isAdult == true;

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final session = _session;

    return ColoredBox(
      color: AppColors.cream,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: sidePadding),
              child: const ExplorerHero(),
            ),
            if (_isAdult && session?.needsFamilySetup == true)
              Padding(
                padding:
                    const EdgeInsets.fromLTRB(sidePadding, 12, sidePadding, 0),
                child: _AdultFamilySetup(
                  onOpenFamily: () {
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const FamilyScreen()));
                  },
                  onJoinInvite: () {
                    Navigator.push(
                        context,
                        MaterialPageRoute(
                            builder: (_) => const JoinInviteScreen()));
                  },
                ),
              ),
            TodaysQuestSlide(
              passage: WeekQuestFlow.passage,
              subtitle: questSubtitle,
              videoSubtitles: SampleEpisodes.week1Package.videos
                  .take(TodaysQuestSlide.cardCount)
                  .map((v) => v.title)
                  .toList(),
              onOpenVideo: (index) =>
                  WeekQuestFlow.openVideo(context, index),
              onQuiz: () => WeekQuestFlow.openQuiz(context),
              onPuzzle: () => WeekQuestFlow.openPuzzle(context),
              progress: game.weekQuest,
            ),
            const SizedBox(height: 28),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: sidePadding),
              child: WordDeclarationCard(),
            ),
          ],
        ),
      ),
    );
  }
}

class _AdultFamilySetup extends StatelessWidget {
  const _AdultFamilySetup(
      {required this.onOpenFamily, required this.onJoinInvite});

  final VoidCallback onOpenFamily;
  final VoidCallback onJoinInvite;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: AppRadii.cardRadius,
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Add a child or teen — your Family is created automatically',
            style: TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Add a child or teen in Family. Your Family group is created automatically. You can also join with an invite.',
            style: TextStyle(
                color: AppColors.textMuted, fontSize: 13, height: 1.35),
          ),
          const SizedBox(height: 12),
          FilledButton(
              onPressed: onOpenFamily, child: const Text('Open Family')),
          const SizedBox(height: 8),
          OutlinedButton(
              onPressed: onJoinInvite, child: const Text('Join with invite')),
        ],
      ),
    );
  }
}
