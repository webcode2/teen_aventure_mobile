import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../adventure_assets.dart';
import '../config/api_config.dart';
import '../services/api_client.dart';
import 'hero_image_store.dart';

class WelcomeCopy {
  const WelcomeCopy({
    this.enabled = true,
    required this.title,
    required this.subtitle,
    required this.quote,
  });

  static const fallback = WelcomeCopy(
    title: "Discover God's Story",
    subtitle: 'Interactive Bible lessons, puzzles, and community for teens.',
    quote: 'Your word is a lamp to my feet and a light to my path. — Psalm 119:105',
  );

  final bool enabled;
  final String title;
  final String subtitle;
  final String quote;

  bool get hasContent =>
      title.trim().isNotEmpty || subtitle.trim().isNotEmpty || quote.trim().isNotEmpty;

  static WelcomeCopy resolve(Object? data, WelcomeCopy current) {
    if (data is! Map || !data.containsKey('welcome')) return current;
    final raw = data['welcome'];
    if (raw is! Map) return current;
    return WelcomeCopy(
      enabled: raw['enabled'] is bool ? raw['enabled'] as bool : current.enabled,
      title: _field(raw, 'title', current.title),
      subtitle: _field(raw, 'subtitle', current.subtitle),
      quote: _field(raw, 'quote', current.quote),
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'title': title,
        'subtitle': subtitle,
        'quote': quote,
      };

  static WelcomeCopy fromJson(Object? raw) {
    if (raw is! Map) return fallback;
    return resolve({'welcome': raw}, fallback);
  }

  static String _field(Map raw, String key, String fallback) {
    if (!raw.containsKey(key)) return fallback;
    final value = raw[key];
    return value is String ? value.trim() : fallback;
  }
}

class HomeAnnouncement {
  const HomeAnnouncement({
    required this.enabled,
    required this.badge,
    required this.text,
    required this.actionLabel,
  });

  static const fallback = HomeAnnouncement(
    enabled: true,
    badge: 'NEW',
    text: 'Welcome to Teen Bible Adventures! Week 1 is now live.',
    actionLabel: 'Explore Week 1',
  );

  final bool enabled;
  final String badge;
  final String text;
  final String actionLabel;

  bool get visible =>
      enabled && (badge.trim().isNotEmpty || text.trim().isNotEmpty || actionLabel.trim().isNotEmpty);

  /// Keeps [current] until [data] includes an announcement object.
  static HomeAnnouncement resolve(Object? data, HomeAnnouncement current) {
    if (data is! Map || !data.containsKey('announcement')) return current;
    final raw = data['announcement'];
    if (raw is! Map) return current;
    return HomeAnnouncement(
      enabled: raw.containsKey('enabled') && raw['enabled'] is bool ? raw['enabled'] as bool : current.enabled,
      badge: _field(raw, 'badge', current.badge),
      text: _field(raw, 'text', current.text),
      actionLabel: _field(raw, 'actionLabel', current.actionLabel),
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'badge': badge,
        'text': text,
        'actionLabel': actionLabel,
      };

  static HomeAnnouncement fromJson(Object? raw) {
    if (raw is! Map) return fallback;
    return resolve({'announcement': raw}, fallback);
  }

  static String _field(Map raw, String key, String fallback) {
    if (!raw.containsKey(key)) return fallback;
    final value = raw[key];
    return value is String ? value.trim() : fallback;
  }
}

class HeroCopy {
  const HeroCopy({
    required this.greeting,
    required this.tagline,
    this.abiUrl = '',
    this.zachUrl = '',
    this.abiFile,
    this.zachFile,
  });

  static const defaultGreeting = 'Hey, Explorer!';
  static const defaultTagline = "Ready for today's adventure in God's Word?";

  final String greeting;
  final String tagline;
  final String abiUrl;
  final String zachUrl;
  final String? abiFile;
  final String? zachFile;

  static const fallback = HeroCopy(
    greeting: defaultGreeting,
    tagline: defaultTagline,
  );

  HeroCopy copyWith({
    String? greeting,
    String? tagline,
    String? abiUrl,
    String? zachUrl,
    String? abiFile,
    String? zachFile,
    bool clearAbiFile = false,
    bool clearZachFile = false,
  }) {
    return HeroCopy(
      greeting: greeting ?? this.greeting,
      tagline: tagline ?? this.tagline,
      abiUrl: abiUrl ?? this.abiUrl,
      zachUrl: zachUrl ?? this.zachUrl,
      abiFile: clearAbiFile ? null : (abiFile ?? this.abiFile),
      zachFile: clearZachFile ? null : (zachFile ?? this.zachFile),
    );
  }

  /// Keeps [current] until [data] is a content document. Empty greeting/tagline stay on [current].
  static HeroCopy resolve(Object? data, HeroCopy current) {
    if (data is! Map) return current;
    final hero = data['hero'];
    if (hero is! Map) return current;
    return current.copyWith(
      greeting: _text(hero['greeting'], current.greeting),
      tagline: _text(hero['tagline'], current.tagline),
      abiUrl: _url(hero, 'abiUrl', current.abiUrl),
      zachUrl: _url({...hero, if (!hero.containsKey('zachUrl') && hero.containsKey('zackUrl')) 'zachUrl': hero['zackUrl']}, 'zachUrl', current.zachUrl),
    );
  }

  Map<String, String?> toJson() => {
        'greeting': greeting,
        'tagline': tagline,
        'abiUrl': abiUrl,
        'zachUrl': zachUrl,
        'abiFile': abiFile,
        'zachFile': zachFile,
      };

  static HeroCopy fromJson(Object? raw) {
    if (raw is! Map) return fallback;
    final canonical = {...raw, if (!raw.containsKey('zachUrl')) 'zachUrl': raw['zackUrl'], if (!raw.containsKey('zachFile')) 'zachFile': raw['zackFile']};
    return HeroCopy(
      greeting: _text(canonical['greeting'], defaultGreeting),
      tagline: _text(canonical['tagline'], defaultTagline),
      abiUrl: canonical['abiUrl'] is String ? (canonical['abiUrl'] as String).trim() : '',
      zachUrl: canonical['zachUrl'] is String ? (canonical['zachUrl'] as String).trim() : '',
      abiFile: canonical['abiFile'] is String ? canonical['abiFile'] as String : null,
      zachFile: canonical['zachFile'] is String ? canonical['zachFile'] as String : null,
    );
  }

  static String _text(Object? value, String fallback) {
    if (value is! String) return fallback;
    final trimmed = value.trim();
    return trimmed.isEmpty ? fallback : trimmed;
  }

  static String _url(Map hero, String key, String fallback) {
    if (!hero.containsKey(key)) return fallback;
    final value = hero[key];
    return value is String ? value.trim() : fallback;
  }
}

class HeroCopyCache {
  static const key = 'hero_copy_v1';

  static HeroCopy read(SharedPreferences prefs) {
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return HeroCopy.fallback;
    try {
      return HeroCopy.fromJson(jsonDecode(raw));
    } catch (_) {
      return HeroCopy.fallback;
    }
  }

  static HomeAnnouncement readAnnouncement(SharedPreferences prefs) {
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return HomeAnnouncement.fallback;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map || !decoded.containsKey('announcement')) return HomeAnnouncement.fallback;
      return HomeAnnouncement.fromJson(decoded['announcement']);
    } catch (_) {
      return HomeAnnouncement.fallback;
    }
  }

  static WelcomeCopy readWelcome(SharedPreferences prefs) {
    final raw = prefs.getString(key);
    if (raw == null || raw.isEmpty) return WelcomeCopy.fallback;
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map || !decoded.containsKey('welcome')) return WelcomeCopy.fallback;
      return WelcomeCopy.fromJson(decoded['welcome']);
    } catch (_) {
      return WelcomeCopy.fallback;
    }
  }

  static Future<void> write(
    SharedPreferences prefs,
    HeroCopy copy, {
    HomeAnnouncement? announcement,
    WelcomeCopy? welcome,
  }) {
    final payload = <String, dynamic>{...copy.toJson()};
    if (announcement != null) payload['announcement'] = announcement.toJson();
    if (welcome != null) payload['welcome'] = welcome.toJson();
    return prefs.setString(key, jsonEncode(payload));
  }
}

class HeroCopyController extends ChangeNotifier with WidgetsBindingObserver {
  HeroCopyController(this._api, this._prefs) {
    WidgetsBinding.instance.addObserver(this);
    _copy = HeroCopyCache.read(_prefs);
    _storedAnnouncement = HeroCopyCache.readAnnouncement(_prefs);
    _storedWelcome = HeroCopyCache.readWelcome(_prefs);
    try {
      final saved = jsonDecode(_prefs.getString('cms_quest_copy') ?? '{}');
      if (saved is Map) _questCopy = Map<String, String>.fromEntries(saved.entries.where((e) => e.key is String && e.value is String).map((e) => MapEntry(e.key as String, e.value as String)));
    } catch (_) { /* use built-in quest labels */ }
    try { final raw = jsonDecode(_prefs.getString('cms_app_text') ?? '{}'); if (raw is Map) _appText = Map<String, dynamic>.from(raw); } catch (_) {}
  }

  final ApiClient _api;
  final SharedPreferences _prefs;
  late HeroCopy _copy;
  Map<String, dynamic> _appText = {};
  String text(String section, String key, String fallback) {
    final group = _appText[section];
    final value = group is Map ? group[key] : null;
    return value is String && value.trim().isNotEmpty ? value : fallback;
  }
  bool get maintenanceMode => _appText['system'] is Map && (_appText['system'] as Map)['maintenanceMode'] == true;
  String get maintenanceMessage => text('system', 'maintenanceMessage', "We're making Teen Bible Adventures even better. Back shortly!");

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) unawaited(refresh());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Map<String, String> _questCopy = {};
  Map<String, String> get questCopy => Map.unmodifiable(_questCopy);

  /// Nullable so a hot reload of an already-created controller still shows the banner.
  HomeAnnouncement? _storedAnnouncement;
  WelcomeCopy? _storedWelcome;

  String get greeting => _copy.greeting;
  String get tagline => _copy.tagline;
  HomeAnnouncement get announcement => _storedAnnouncement ?? HomeAnnouncement.fallback;
  WelcomeCopy get welcome => _storedWelcome ?? WelcomeCopy.fallback;

  ImageProvider get abiImage => heroImageProvider(
        asset: AdventureAssets.abi,
        url: _absolute(_copy.abiUrl),
        filePath: _copy.abiFile,
      );

  ImageProvider get zachImage => heroImageProvider(
        asset: AdventureAssets.zach,
        url: _absolute(_copy.zachUrl),
        filePath: _copy.zachFile,
      );

  Future<void>? _refreshing;

  Future<void> refresh() {
    final current = _refreshing;
    if (current != null) return current;
    final run = _refreshFromDashboard();
    _refreshing = run;
    return run.whenComplete(() {
      if (identical(_refreshing, run)) _refreshing = null;
    });
  }

  Future<void> _refreshFromDashboard() async {
    try {
      final wasMaintenance = maintenanceMode;
      final previousMessage = maintenanceMessage;
      // Dashboard maintenance must not wait out the published-content cache.
      final response = await _api.dio.get('/api/content/mobile', options: Options(extra: const {'skipCache': true}));
      final previous = _copy;
      var questChanged = false;
      if (response.data is Map) {
        final next = Map<String, dynamic>.from(response.data as Map);
        questChanged = jsonEncode(next) != jsonEncode(_appText);
        _appText = next;
        await _prefs.setString('cms_app_text', jsonEncode(next));
        questChanged = questChanged || wasMaintenance != maintenanceMode || previousMessage != maintenanceMessage;
      }
      final payload = response.data;
      if (payload is Map && payload['quest'] is Map) {
        final raw = payload['quest'] as Map;
        final next = Map<String, String>.fromEntries(raw.entries.where((e) => e.key is String && e.value is String).map((e) => MapEntry(e.key as String, e.value as String)));
        questChanged = questChanged || jsonEncode(next) != jsonEncode(_questCopy);
        _questCopy = next;
        await _prefs.setString('cms_quest_copy', jsonEncode(next));
      }
      final previousAnnouncement = announcement;
      var copy = HeroCopy.resolve(response.data, previous).copyWith(
        abiFile: previous.abiFile,
        zachFile: previous.zachFile,
      );
      _copy = copy;
      final previousWelcome = welcome;
      _storedAnnouncement = HomeAnnouncement.resolve(response.data, previousAnnouncement);
      _storedWelcome = WelcomeCopy.resolve(response.data, previousWelcome);
      final textChanged = copy.greeting != previous.greeting || copy.tagline != previous.tagline;
      final imagesChanged = copy.abiUrl != previous.abiUrl || copy.zachUrl != previous.zachUrl;
      final announcementChanged = announcement.enabled != previousAnnouncement.enabled ||
          announcement.badge != previousAnnouncement.badge ||
          announcement.text != previousAnnouncement.text ||
          announcement.actionLabel != previousAnnouncement.actionLabel;
      final welcomeChanged = welcome.enabled != previousWelcome.enabled ||
          welcome.title != previousWelcome.title ||
          welcome.subtitle != previousWelcome.subtitle ||
          welcome.quote != previousWelcome.quote;
      if (questChanged || textChanged ||
          announcementChanged ||
          welcomeChanged ||
          (imagesChanged && !heroImageUsesFiles)) {
        notifyListeners();
      }
      copy = await _syncImage(copy, 'abi', previous.abiUrl);
      copy = await _syncImage(copy, 'zach', previous.zachUrl);
      _copy = copy;
      await HeroCopyCache.write(
        _prefs,
        copy,
        announcement: announcement,
        welcome: welcome,
      );
    } catch (_) {
      /* keep the last cached copy */
    }
  }

  Future<HeroCopy> _syncImage(HeroCopy copy, String which, String previousUrl) async {
    final isAbi = which == 'abi';
    final url = isAbi ? copy.abiUrl : copy.zachUrl;
    final file = isAbi ? copy.abiFile : copy.zachFile;
    if (url.isEmpty) {
      if (file == null) return copy;
      await deleteHeroImage(file);
      final cleared = isAbi ? copy.copyWith(clearAbiFile: true) : copy.copyWith(clearZachFile: true);
      _copy = cleared;
      notifyListeners();
      return cleared;
    }
    if (!heroImageUsesFiles || (url == previousUrl && heroImageReady(file))) return copy;
    try {
      final response = await _api.dio.get<List<int>>(
        url,
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = response.data;
      if (bytes == null || bytes.isEmpty) return copy;
      final saved = await saveHeroImage(which, bytes);
      if (saved != null && file != null && file != saved) await deleteHeroImage(file);
      final updated = isAbi ? copy.copyWith(abiFile: saved ?? file) : copy.copyWith(zachFile: saved ?? file);
      _copy = updated;
      notifyListeners();
      return updated;
    } catch (_) {
      final reverted = isAbi ? copy.copyWith(abiUrl: previousUrl) : copy.copyWith(zachUrl: previousUrl);
      _copy = reverted;
      return reverted;
    }
  }

  String _absolute(String url) {
    if (url.isEmpty || url.startsWith('http://') || url.startsWith('https://')) return url;
    final path = url.startsWith('/') ? url : '/$url';
    return '${ApiConfig.baseUrl}$path';
  }
}
