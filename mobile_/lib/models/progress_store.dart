import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class ProgressStore {
  static Future<Map<String, dynamic>?> load(String episodeId) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('progress_$episodeId');
    if (raw == null || raw.isEmpty) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> save(String episodeId, Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('progress_$episodeId', jsonEncode(data));
  }

  static Future<void> clear(String episodeId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('progress_$episodeId');
  }
}
