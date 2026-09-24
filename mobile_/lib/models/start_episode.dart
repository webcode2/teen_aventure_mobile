import 'episode.dart';
import 'game_controller.dart';
import 'layout_seeds.dart';
import 'progress_store.dart';
import 'puzzle_contract.dart';
import 'puzzle_contract_loader.dart';
import 'puzzle_engine.dart';

/// Starts a puzzle session from the canonical contract asset.
/// Falls back to [PuzzleEngine] only if the asset cannot produce a crossword.
Future<GameController> startEpisode(
  Episode ep, {
  String userId = 'default_teen',
  bool forceReroll = false,
  String canonicalAsset = kDefaultCanonicalAsset,
}) async {
  const loader = PuzzleContractLoader();
  final result = await loader.loadAsset(canonicalAsset);
  final episode = loader.episodeOrNull(result);

  final GameController game;
  if (episode != null) {
    game = GameController(initialEpisode: episode);
  } else {
    final seed = forceReroll
        ? await LayoutSeeds.reroll(ep.id, userId)
        : await LayoutSeeds.current(ep.id, userId);
    game = GameController(initialEpisode: PuzzleEngine.build(ep, seed));
    if (result is PuzzleRejected ||
        (result is PuzzleLoaded && result.envelope.data is UnsupportedPuzzle)) {
      game.applyLoadResult(result);
    }
  }

  if (!forceReroll && game.puzzleScreenState == PuzzleScreenState.ready) {
    final savedProgress = await ProgressStore.load(ep.id);
    if (savedProgress != null) {
      game.restore(savedProgress);
    }
  }

  return game;
}

Future<void> completeAndReroll(String episodeId, {String userId = 'default_teen'}) async {
  await ProgressStore.clear(episodeId);
  await LayoutSeeds.reroll(episodeId, userId);
}
