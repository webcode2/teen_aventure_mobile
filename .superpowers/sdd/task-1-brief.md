### Task 1: Record each watched video once

**Files:**
- Create: `mobile_/test/home_quest_progress_test.dart`
- Modify: `mobile_/lib/models/game_controller.dart:31-31` and `mobile_/lib/models/game_controller.dart:114-140`
- Test: `mobile_/test/home_quest_progress_test.dart`

**Interfaces:**
- Consumes: `GameController.completeVideoPart(int partIndex)`, `QuestPoints.video` (value 1), starting `score` 120
- Produces: `completedVideoParts` getter (longest prefix), `weekVideosDone` getter (count of indexes 0–2), `weekQuest` still built from `weekVideosDone`

- [ ] **Step 1: Write the failing test**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/game_controller.dart';

void main() {
  test('watching video 3 first does not mark videos 1 and 2', () {
    final game = GameController();
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 0);
    expect(game.weekVideosDone, 1);
    expect(game.score, 121);
  });

  test('the same video awards points once', () {
    final game = GameController();
    game.completeVideoPart(2);
    game.completeVideoPart(2);
    expect(game.weekVideosDone, 1);
    expect(game.score, 121);
  });

  test('three distinct videos open the quest count', () {
    final game = GameController();
    game.completeVideoPart(0);
    game.completeVideoPart(1);
    game.completeVideoPart(2);
    expect(game.completedVideoParts, 3);
    expect(game.weekVideosDone, 3);
    expect(game.weekQuest.videosCompleted, 3);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: FAIL. `completedVideoParts` is 3 after `completeVideoPart(2)` because the current code treats the highest index as a finished prefix.

- [ ] **Step 3: Write minimal implementation**

In `mobile_/lib/models/game_controller.dart`, replace the `completedVideoParts` field:

```dart
  final Set<int> _watchedVideoParts = <int>{};

  /// Longest finished prefix: index 0, then 1, then 2.
  int get completedVideoParts {
    var prefix = 0;
    while (_watchedVideoParts.contains(prefix)) {
      prefix += 1;
    }
    return prefix;
  }
```

Replace `completeVideoPart` and `weekVideosDone`:

```dart
  void completeVideoPart(int partIndex) {
    if (partIndex < 0) return;
    if (!_watchedVideoParts.add(partIndex)) return;
    score += QuestPoints.video;
    gems += 1;
    notifyListeners();
  }

  int get weekVideosDone =>
      _watchedVideoParts.where((index) => index >= 0 && index < 3).length;
```

Leave `weekQuest` as it is. It already reads `weekVideosDone`.

- [ ] **Step 4: Run test to verify it passes**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: PASS. All three tests pass.

- [ ] **Step 5: Commit**

```bash
git add mobile_/test/home_quest_progress_test.dart mobile_/lib/models/game_controller.dart
git commit -m "$(cat <<'EOF'
fix: count each watched home video on its own

EOF
)"
```

---

