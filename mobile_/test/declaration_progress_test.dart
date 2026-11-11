import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/data/declaration_progress.dart';

void main() {
  test('the tap count survives leaving the screen, per explorer', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final ada = DeclarationProgress(prefs, profile: 'u:ada', refKey: 'word-declaration-w3');
    final ben = DeclarationProgress(prefs, profile: 'u:ben', refKey: 'word-declaration-w3');

    final today = DateTime(2026, 11, 11);
    await ada.save(today, 7);

    expect(DeclarationProgress(prefs, profile: 'u:ada', refKey: 'word-declaration-w3').load(today), 7);
    expect(ben.load(today), 0);
    expect(ada.load(DateTime(2026, 11, 12)), 0);
    expect(DeclarationProgress(prefs, profile: 'u:ada', refKey: 'word-declaration-w4').load(today), 0);
  });
}
