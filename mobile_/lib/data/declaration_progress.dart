import 'package:shared_preferences/shared_preferences.dart';

/// Stores today's declaration count per explorer and weekly declaration.
class DeclarationProgress {
  DeclarationProgress(this._prefs,
      {required String profile, required String refKey})
      : _key = 'word_declaration_v2:$profile:$refKey',
        _legacyKey = 'word_declaration_v1:$profile:$refKey';

  final SharedPreferences _prefs;
  final String _key;
  final String _legacyKey;

  static String dayKey(DateTime day) => '${day.year}-${day.month}-${day.day}';

  int load(DateTime day) {
    final saved = _prefs.getString(_key);
    if (saved == null) return _prefs.getInt(_legacyKey) ?? 0;
    final prefix = '${dayKey(day)}:';
    return saved.startsWith(prefix)
        ? int.tryParse(saved.substring(prefix.length)) ?? 0
        : 0;
  }

  Future<void> save(DateTime day, int taps) =>
      _prefs.setString(_key, '${dayKey(day)}:$taps');
}
