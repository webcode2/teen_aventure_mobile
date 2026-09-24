import 'dart:math';
import 'package:shared_preferences/shared_preferences.dart';

class LayoutSeeds {
  static Future<int> current(String episodeId, String userId) async {
    final prefs = await SharedPreferences.getInstance();
    final key = 'seed_${episodeId}_$userId';
    return prefs.getInt(key) ?? _roll(prefs, key);
  }

  static Future<int> reroll(String episodeId, String userId) async {
    final prefs = await SharedPreferences.getInstance();
    return _roll(prefs, 'seed_${episodeId}_$userId');
  }

  static int _roll(SharedPreferences prefs, String key) {
    final seed = Random().nextInt(1 << 30);
    prefs.setInt(key, seed);
    return seed;
  }
}
