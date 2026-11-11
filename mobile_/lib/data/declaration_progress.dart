import 'package:shared_preferences/shared_preferences.dart';

/// Word Declaration taps saved on the phone, per explorer and per week's
/// declaration, so the count and the done state survive leaving the screen.
class DeclarationProgress {
  DeclarationProgress(this._prefs,
      {required String profile, required String refKey})
      : _key = 'word_declaration_v1:$profile:$refKey';

  final SharedPreferences _prefs;
  final String _key;

  int load() => _prefs.getInt(_key) ?? 0;

  Future<void> save(int taps) => _prefs.setInt(_key, taps);
}
