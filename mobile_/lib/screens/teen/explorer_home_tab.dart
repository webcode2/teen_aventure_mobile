import '../../providers/cms_text.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/api_models.dart';
import '../../models/auth_session.dart';
import '../../models/game_controller.dart';
import '../../providers/current_quest_provider.dart';
import '../../providers/hero_copy.dart';
import '../../theme.dart';
import '../../services/service_locator.dart';
import '../auth/auth_chrome.dart';
import '../auth/register_adult_screen.dart';
import '../family/family_screen.dart';
import '../groups/join_invite_screen.dart';
import 'widgets/explorer_hero.dart';
import 'widgets/home_announcement_banner.dart';
import 'widgets/todays_quest_card.dart';
import 'widgets/welcome_onboarding_dialog.dart';
import 'widgets/word_declaration_card.dart';
import 'week_quest_flow.dart';

class ExplorerHomeTab extends StatefulWidget {
  const ExplorerHomeTab({super.key});

  @override
  State<ExplorerHomeTab> createState() => _ExplorerHomeTabState();
}

class _ExplorerHomeTabState extends State<ExplorerHomeTab> {
  static const double sidePadding = 16;
  bool _familyDialogOffered = false;
  bool _welcomeOffered = false;

  AuthSession? get _session {
    try {
      return context.watch<AuthSession>();
    } catch (_) {
      return null;
    }
  }

  bool _isAge20OrOver(AuthSession session) {
    final year = session.birthYear;
    if (year == null) return false;
    return ageFromBirthYear(year) >= adultMinAge;
  }

  bool _shouldOfferFamilyDialog(AuthSession? session) {
    if (session == null || !session.needsFamilySetup || !_isAge20OrOver(session)) {
      return false;
    }
    return ServiceLocator.instance.prefs.getBool(offerFamilySetupDialogKey) == true;
  }

  void _offerFamilyDialogIfNeeded(AuthSession? session) {
    if (_familyDialogOffered || !_shouldOfferFamilyDialog(session)) return;
    _familyDialogOffered = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted || !_shouldOfferFamilyDialog(_session)) return;
      await ServiceLocator.instance.prefs.setBool(offerFamilySetupDialogKey, false);
      if (!mounted) return;
      await _showFamilySetupDialog();
    });
  }

  void _offerWelcomeIfNeeded(HeroCopyController hero) {
    final prefs = ServiceLocator.instance.prefs;
    if (!WelcomeOnboardingDialog.shouldOffer(
      enabled: hero.welcome.enabled,
      alreadyOffered: _welcomeOffered,
      hasContent: hero.welcome.hasContent,
      seen: prefs.getBool(WelcomeOnboardingDialog.prefsKey),
    )) {
      return;
    }
    _welcomeOffered = true;
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      if (!hero.welcome.enabled) {
        _welcomeOffered = false;
        return;
      }
      if (prefs.getBool(WelcomeOnboardingDialog.prefsKey) == true) return;
      await showDialog<void>(
        context: context,
        barrierDismissible: true,
        barrierColor: AppColors.navy.withValues(alpha: 0.72),
        builder: (_) => WelcomeOnboardingDialog(welcome: hero.welcome),
      );
      await prefs.setBool(WelcomeOnboardingDialog.prefsKey, true);
    });
  }

  Future<void> _showFamilySetupDialog() async {
    await showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: AppRadii.cardRadius,
            side: const BorderSide(color: AppColors.border),
          ),
          title: const Text(
            'Add a child or teen — your Family is created automatically',
            style: TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w900,
              fontSize: 16,
            ),
          ),
          content: const Text(
            'Add a child or teen in Family. Your Family group is created automatically. You can also join with an invite.',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 13,
              height: 1.35,
            ),
          ),
          actionsAlignment: MainAxisAlignment.center,
          actionsOverflowButtonSpacing: 8,
          actions: [
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  Navigator.pop(dialogContext);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const FamilyScreen()),
                  );
                },
                child: const Text('Open Family'),
              ),
            ),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(dialogContext);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const JoinInviteScreen()),
                  );
                },
                child: const Text('Join with invite'),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final game = context.watch<GameController>();
    final hero = context.watch<HeroCopyController>();
    final quests = _quests;
    final current = quests?.current;
    final session = _session;
    final profile = '${session?.userId ?? ""}:${session?.effectiveChildId ?? ""}';
    final firstName = session?.displayName?.trim().split(RegExp(r'\s+')).first ?? '';
    _offerWelcomeIfNeeded(hero);
    _offerFamilyDialogIfNeeded(session);
    if (current != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) {
          game.startWeek(
            current.weekNumber,
            quizDone: current.quizDone,
            puzzleDone: current.puzzleDone,
            puzzleId: current.quest.puzzleId,
            profile: profile,
          );
        }
      });
    }
    return ColoredBox(
      color: AppColors.cream,
      child: RefreshIndicator(
        color: AppColors.orange,
        backgroundColor: Colors.white,
        onRefresh: () async {
          await Future.wait([
            if (quests != null) quests.refresh(),
            hero.refresh(),
          ]);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(
            parent: BouncingScrollPhysics(),
          ),
          padding: const EdgeInsets.fromLTRB(0, 8, 0, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: sidePadding),
                child: ExplorerHero(
                  greeting: firstName.isEmpty
                      ? hero.greeting
                      : 'Hey, $firstName!',
                  tagline: hero.tagline,
                  abi: hero.abiImage,
                  zach: hero.zachImage,
                ),
              ),
              HomeAnnouncementBanner(
                announcement: hero.announcement,
                onAction: current == null || hero.announcement.actionLabel.trim().isEmpty
                    ? null
                    : () => WeekQuestFlow.openNext(context),
              ),
              if (current != null && quests?.isOffline == true)
                Padding(
                  padding: const EdgeInsets.fromLTRB(sidePadding, 16, sidePadding, 0),
                  child: Text(
                    cmsText(context, 'home', 'offline', "You're offline"),
                    style: const TextStyle(
                      color: AppColors.textMuted,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              if (current != null) ...[
                if (current.awaitingNextWeek && quests?.isBrowsing != true)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(sidePadding, 16, sidePadding, 0),
                    child: Text(
                      _awaitingNextWeekCopy(current),
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                        height: 1.35,
                      ),
                    ),
                  ),
                TodaysQuestSlide(
                  weekLabel: 'Week ${current.weekNumber}',
                  passage: current.passage,
                  subtitle: _memoryVerse(current.quest.scripture),
                  videoSubtitles: [for (final video in current.quest.videos) video.title],
                  thumbnailUrl: _activeThumb(current),
                  onOpenVideo: (index) => WeekQuestFlow.openVideo(context, index),
                  onQuiz: () => WeekQuestFlow.openQuiz(context),
                  onPuzzle: () => WeekQuestFlow.openPuzzle(context),
                  gameStepTitle: current.quest.gameStepTitle,
                  progress: WeekQuestFlow.progress(context),
                  allWeeksDone: current.caughtUp && quests?.isBrowsing != true,
                  stepsOpen: quests?.isBrowsing == true,
                ),
              ] else
                _QuestPlaceholder(quests: quests),
              if (current != null && current.quest.declarationText.trim().isNotEmpty) ...[
                const SizedBox(height: 28),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: sidePadding),
                  child: WordDeclarationCard(
                    title: cmsText(context, 'home', 'declarationTitle', 'Word Declaration'),
                    key: ValueKey('word-declaration-$profile-${current.quest.id}'),
                    declaration: current.quest.declarationText.trim(),
                    reference: _memoryVerse(current.quest.scripture),
                    refKey: 'word-declaration-${current.quest.id}',
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  CurrentQuestProvider? get _quests {
    try {
      return context.watch<CurrentQuestProvider>();
    } catch (_) {
      return null;
    }
  }

  String _awaitingNextWeekCopy(CurrentQuest current) {
    final opens = current.nextWeekOpensAt?.toLocal();
    if (opens != null) {
      final y = opens.year.toString().padLeft(4, '0');
      final m = opens.month.toString().padLeft(2, '0');
      final d = opens.day.toString().padLeft(2, '0');
      return 'You finished this week\'s quest. Your next home quest opens Sunday $y-$m-$d. '
          'You can still explore other weeks on the map.';
    }
    return 'You finished this week\'s quest. Your next home quest opens Sunday morning. '
        'You can still explore other weeks on the map.';
  }

  String? _activeThumb(CurrentQuest current) {
    final videos = current.quest.videos;
    if (videos.isEmpty) return null;
    final next = WeekQuestFlow.progress(context).nextVideoIndex;
    final index = next != null && next < videos.length ? next : 0;
    return videos[index].resolvedThumbnail;
  }

  /// "Genesis 1:1 — In the beginning…" → the reference, for the one-line subtitle.
  static String _memoryVerse(String scripture) {
    final dash = scripture.indexOf(' — ');
    return dash > 0 ? scripture.substring(0, dash) : scripture;
  }
}

class _QuestPlaceholder extends StatelessWidget {
  const _QuestPlaceholder({required this.quests});

  final CurrentQuestProvider? quests;

  @override
  Widget build(BuildContext context) {
    final loading = quests == null || quests!.isLoading;
    final offline = quests?.isOffline == true;
    final detail = quests?.error;
    final message = loading
        ? 'Loading'
        : offline
            ? "You're offline"
            : "Couldn't load this week";
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        _ExplorerHomeTabState.sidePadding,
        28,
        _ExplorerHomeTabState.sidePadding,
        8,
      ),
      child: Column(
        children: [
          if (loading)
            const Padding(
              padding: EdgeInsets.only(bottom: 12),
              child: SizedBox(
                width: 28,
                height: 28,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Icon(
                offline ? Icons.wifi_off_rounded : Icons.cloud_off_rounded,
                color: AppColors.textMuted,
                size: 28,
              ),
            ),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppColors.navy,
              fontWeight: FontWeight.w700,
              fontSize: 16,
            ),
          ),
          if (!loading && detail != null && detail.trim().isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted, fontSize: 13),
            ),
          ],
          if (!loading && quests != null) ...[
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => quests!.refresh(),
              child: const Text('Try again'),
            ),
          ],
        ],
      ),
    );
  }
}

