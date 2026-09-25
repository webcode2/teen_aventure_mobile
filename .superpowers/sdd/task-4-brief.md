### Task 4: Drop the app-wide font bump to +1

**Files:**
- Modify: `mobile_/lib/theme.dart` (`kAppFontBump`)
- Modify: `mobile_/test/home_quest_progress_test.dart`

**Interfaces:**
- Consumes: `kAppFontBump` in `mobile_/lib/theme.dart`
- Produces: `kAppFontBump == 1`

- [ ] **Step 1: Write the failing expectation**

Add this import and test to `mobile_/test/home_quest_progress_test.dart`:

```dart
import 'package:teen_aventure/theme.dart';
```

```dart
  test('app font bump is one point', () {
    expect(kAppFontBump, 1);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: FAIL. `kAppFontBump` is 3.

- [ ] **Step 3: Set the bump**

In `mobile_/lib/theme.dart`:

```dart
const double kAppFontBump = 1;
```

Do not change `kAppTextScale` or any `fontSize` literal.

- [ ] **Step 4: Run test to verify it passes**

Run from `mobile_`: `flutter test test/home_quest_progress_test.dart`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile_/lib/theme.dart mobile_/test/home_quest_progress_test.dart
git commit -m "$(cat <<'EOF'
fix: reduce the app-wide font bump to one point

EOF
)"
```
