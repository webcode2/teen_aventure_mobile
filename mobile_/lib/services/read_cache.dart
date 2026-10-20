import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// How long a cached GET may be reused before the app asks the server again.
class ReadCachePolicy {
  static String normalize(String path) {
    final cut = path.indexOf('?');
    final raw = cut == -1 ? path : path.substring(0, cut);
    if (raw.startsWith('/api/v1/')) return raw.substring('/api/v1'.length);
    if (raw.startsWith('/api/')) return raw.substring('/api'.length);
    return raw;
  }

  static bool isPublished(String path) {
    final normalized = normalize(path);
    return normalized == '/content/mobile' ||
        normalized == '/content/web' ||
        normalized == '/teen-quest/weeks' ||
        RegExp(r'^/teen-quest/weeks/\d+$').hasMatch(normalized) ||
        normalized == '/puzzles/live' ||
        RegExp(r'^/puzzles/id/[^/]+/live$').hasMatch(normalized) ||
        normalized == '/matchings/live' ||
        RegExp(r'^/matchings/id/[^/]+/live$').hasMatch(normalized) ||
        normalized == '/site-pages' ||
        RegExp(r'^/site-pages/[^/]+$').hasMatch(normalized);
  }

  static bool isPersonal(String path) {
    final normalized = normalize(path);
    return normalized == '/teen-quest/current' ||
        RegExp(r'^/teen-quest/weeks/\d+/progress$').hasMatch(normalized) ||
        normalized.startsWith('/engagement/score/') ||
        normalized == '/engagement/family' ||
        normalized == '/engagement/group-jar' ||
        normalized == '/engagement/nudges' ||
        normalized == '/engagement/class-messages' ||
        normalized.startsWith('/engagement/leaderboard/') ||
        normalized == '/engagement/achievements' ||
        normalized == '/auth/me' ||
        normalized == '/families/my' ||
        normalized == '/memberships' ||
        normalized.startsWith('/memberships/') ||
        normalized == '/consent/packs';
  }

  /// Fresh window. Null means this GET is not cached.
  static Duration? freshFor(String path) {
    if (isPublished(path)) return const Duration(minutes: 15);
    if (isPersonal(path)) return const Duration(seconds: 90);
    return null;
  }

  /// Last copy still shown when the network fails.
  static Duration? staleFor(String path) {
    if (isPublished(path)) return const Duration(days: 7);
    if (isPersonal(path)) return const Duration(hours: 12);
    return null;
  }
}

class ReadCacheEntry {
  const ReadCacheEntry({required this.key, required this.at, required this.body});

  final String key;
  final int at;
  final Object? body;
}

/// Memory plus a bounded SharedPreferences copy of GET responses.
class AppReadCache {
  AppReadCache(this._store, {int Function()? clock}) : _clock = clock ?? _now;

  static const manifestKey = 'app.read.cache.manifest.v1';
  static const maxEntries = 40;
  static const maxDiskChars = 180000;

  final ReadCacheStore _store;
  final int Function() _clock;
  final Map<String, ReadCacheEntry> _memory = {};

  static int _now() => DateTime.now().millisecondsSinceEpoch;

  String storageId(String key) {
    var hash = 0x811c9dc5;
    for (final unit in key.codeUnits) {
      hash ^= unit;
      hash = (hash * 0x01000193) & 0x7fffffff;
    }
    return 'app.read.cache.v1.$hash';
  }

  String entryKey({
    required String path,
    required Map<String, dynamic> query,
    required String scope,
  }) {
    final names = query.keys.map((name) => name.toString()).toList()..sort();
    final encoded = names.map((name) => '$name=${query[name]}').join('&');
    final normalized = ReadCachePolicy.normalize(path);
    return '$scope|$normalized|$encoded';
  }

  Object? fresh(String key, Duration ttl) => _within(key, ttl);

  Object? stale(String key, Duration ttl) => _within(key, ttl);

  Object? _within(String key, Duration ttl) {
    final entry = _load(key);
    if (entry == null) return null;
    if (_clock() - entry.at > ttl.inMilliseconds) return null;
    return entry.body;
  }

  void save(String key, Object? body) {
    final entry = ReadCacheEntry(key: key, at: _clock(), body: body);
    _memory[key] = entry;
    final encoded = jsonEncode({
      'key': key,
      'at': entry.at,
      'body': body,
    });
    if (encoded.length > maxDiskChars) return;
    _store.setString(storageId(key), encoded);
    final manifest = _store.getStringList(manifestKey).where((item) => item != key).toList();
    manifest.add(key);
    final overflow = manifest.length - maxEntries;
    if (overflow > 0) {
      for (final dropped in manifest.take(overflow)) {
        _memory.remove(dropped);
        _store.remove(storageId(dropped));
      }
      manifest.removeRange(0, overflow);
    }
    _store.setStringList(manifestKey, manifest);
  }

  void invalidateScope(String scope) {
    final prefix = '$scope|';
    final manifest = _store.getStringList(manifestKey);
    final kept = <String>[];
    for (final key in manifest) {
      if (key.startsWith(prefix)) {
        _memory.remove(key);
        _store.remove(storageId(key));
      } else {
        kept.add(key);
      }
    }
    for (final key in _memory.keys.where((item) => item.startsWith(prefix)).toList()) {
      _memory.remove(key);
    }
    _store.setStringList(manifestKey, kept);
  }

  ReadCacheEntry? _load(String key) {
    final cached = _memory[key];
    if (cached != null) return cached;
    final raw = _store.getString(storageId(key));
    if (raw == null || raw.isEmpty) return null;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map || decoded['key'] != key) return null;
      final entry = ReadCacheEntry(
        key: key,
        at: (decoded['at'] as num?)?.toInt() ?? 0,
        body: decoded['body'],
      );
      _memory[key] = entry;
      return entry;
    } catch (_) {
      return null;
    }
  }
}

abstract class ReadCacheStore {
  String? getString(String key);
  List<String> getStringList(String key);
  void setString(String key, String value);
  void setStringList(String key, List<String> value);
  void remove(String key);
}

class MemoryReadCacheStore implements ReadCacheStore {
  final Map<String, String> strings = {};
  final Map<String, List<String>> lists = {};

  @override
  String? getString(String key) => strings[key];

  @override
  List<String> getStringList(String key) => List<String>.from(lists[key] ?? const []);

  @override
  void remove(String key) => strings.remove(key);

  @override
  void setString(String key, String value) => strings[key] = value;

  @override
  void setStringList(String key, List<String> value) => lists[key] = List<String>.from(value);
}

class PreferencesReadCacheStore implements ReadCacheStore {
  PreferencesReadCacheStore(this._prefs);

  final SharedPreferences _prefs;

  @override
  String? getString(String key) => _prefs.getString(key);

  @override
  List<String> getStringList(String key) => _prefs.getStringList(key) ?? const [];

  @override
  void remove(String key) {
    _prefs.remove(key);
  }

  @override
  void setString(String key, String value) {
    _prefs.setString(key, value);
  }

  @override
  void setStringList(String key, List<String> value) {
    _prefs.setStringList(key, value);
  }
}
