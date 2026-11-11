import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/data/declaration_progress.dart';

void main() {
  test('the tap count survives leaving the screen, per explorer', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final ada = DeclarationProgress(prefs, profile: 'u:ada', refKey: 'word-declaration-w3');
    final ben = DeclarationProgress(prefs, profile: 'u:ben', refKey: 'word-declaration-w3');

    await ada.save(7);

    expect(DeclarationProgress(prefs, profile: 'u:ada', refKey: 'word-declaration-w3').load(), 7);
    expect(ben.load(), 0);
    expect(DeclarationProgress(prefs, profile: 'u:ada', refKey: 'word-declaration-w4').load(), 0);
  });
}
