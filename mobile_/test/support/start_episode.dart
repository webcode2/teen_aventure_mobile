import '../../lib/models/episode.dart';
import '../../lib/models/game_controller.dart';
import 'layout_seeds.dart';
import '../../lib/models/progress_store.dart';
import '../../lib/models/puzzle_contract_loader.dart';
import '../../lib/services/service_locator.dart';

/// Starts a puzzle session from the live backend puzzle only.
/// Pass [puzzleId] for a week's attached Studio puzzle so the grid stays stable.
/// On missing/invalid data, the controller is left in a technical-issue state.
Future<GameController> startEpisode(
  Episode ep, {
  String userId = 'default_teen',
  bool forceReroll = false,
  String? puzzleId,
}) async {
  const loader = PuzzleContractLoader();

  try {
    final live = await ServiceLocator.instance.contentService.getLivePuzzle(
      puzzleId: puzzleId,
    );
    if (live != null) {
      final result = loader.loadJson(live.doc);
      final episode = loader.episodeOrNull(result);
      if (episode != null) {
        final game = GameController(initialEpisode: episode);
        game.activePuzzleVersionId = live.versionId;
        game.activePuzzleTitle = live.title;
        final id = puzzleId?.trim();
        if (id != null && id.isNotEmpty) game.boundPuzzleId = id;
        game.isLoadedFromDb = true;
        if (!forceReroll && game.puzzleScreenState == PuzzleScreenState.ready) {
          final savedProgress = await ProgressStore.load(ep.id);
          if (savedProgress != null) {
            game.restore(savedProgress);
          }
        }
        return game;
      }
      final failed = GameController();
      failed.applyLoadResult(result);
      return failed;
    }
  } catch (_) {}

  final game = GameController();
  game.markTechnicalIssue();
  return game;
}

Future<void> completeAndReroll(String episodeId, {String userId = 'default_teen'}) async {
  await ProgressStore.clear(episodeId);
  await LayoutSeeds.reroll(episodeId, userId);
}
