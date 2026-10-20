import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import '../config/store_config.dart';
import '../firebase_options.dart';
import 'api_client.dart';
import 'device_identity.dart';
import 'push_service_stub.dart' if (dart.library.io) 'push_service_io.dart' as impl;

/// FCM push. Uses `--dart-define=FIREBASE_*` when set, otherwise FlutterFire defaults.
class PushService {
  PushService(this._apiClient);

  final ApiClient _apiClient;
  bool _started = false;
  Future<void>? _starting;
  bool _hasSession = false;
  /// Set when the user removes this phone from Devices so we do not re-register until next login.
  bool _registrationPaused = false;

  /// Prefer build-time dart-defines; fall back to [DefaultFirebaseOptions] so
  /// `flutter install` / `flutter run` without defines still register for push.
  FirebaseOptions? get _options {
    if (StoreConfig.firebaseConfigured) {
      return const FirebaseOptions(
        apiKey: StoreConfig.firebaseApiKey,
        appId: StoreConfig.firebaseAppId,
        messagingSenderId: StoreConfig.firebaseMessagingSenderId,
        projectId: StoreConfig.firebaseProjectId,
      );
    }
    if (kIsWeb) return null;
    try {
      return DefaultFirebaseOptions.currentPlatform;
    } catch (_) {
      return null;
    }
  }

  bool get _pushReady => _options != null;

  String get _platform {
    if (defaultTargetPlatform == TargetPlatform.iOS) return 'ios';
    if (defaultTargetPlatform == TargetPlatform.android) return 'android';
    return defaultTargetPlatform.name;
  }

  Future<void> start() {
    if (_started) return Future.value();
    return _starting ??= _initializePush().whenComplete(() => _starting = null);
  }

  Future<void> _initializePush() async {
    final options = _options;
    final ready = options != null;
    await impl.startPush(
      configured: ready,
      options: options,
      onToken: _registerToken,
    );
    _started = ready;
    if (kDebugMode && !ready) {
      debugPrint('PushService: Firebase options missing — push disabled');
    }
  }

  Future<void> syncIdentity({String? userId, String? childId}) async {
    if (!_started && !_pushReady) return;
    if (!_started) await start();
    final externalId = childId ?? userId;
    final hadSession = _hasSession;
    _hasSession = externalId != null && externalId.isNotEmpty;
    // A fresh sign-in may opt back into push after a local revoke.
    if (_hasSession && !hadSession) _registrationPaused = false;
    await impl.identifyPushUser(externalId);
    if (!_hasSession || _registrationPaused) return;
    // FCM can return null briefly after permission — retry a few times.
    for (var attempt = 0; attempt < 4; attempt++) {
      final token = await impl.currentPushSubscriptionId();
      if (token != null && token.isNotEmpty) {
        await _registerToken(token);
        return;
      }
      await Future<void>.delayed(Duration(milliseconds: 400 * (attempt + 1)));
    }
    if (kDebugMode) {
      debugPrint('PushService: no FCM token after sync (permission/Play Services?)');
    }
  }

  Future<void> _registerToken(String token) async {
    if (!_hasSession || token.isEmpty || _registrationPaused) return;
    try {
      final identity = await readDeviceIdentity();
      await _apiClient.dio.post('/api/auth/push-subscription', data: {
        'fcmToken': token,
        'platform': _platform,
        ...identity.toJson(),
      });
      if (kDebugMode) {
        debugPrint('PushService: registered FCM token (${token.length} chars)');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('PushService: register failed: $e');
      }
    }
  }

  Future<String?> currentToken() async {
    if (!_started && !_pushReady) return null;
    if (!_started) await start();
    return impl.currentPushSubscriptionId();
  }

  /// Stop push on this phone after the user removes it from Devices.
  Future<void> revokeLocalRegistration() async {
    _registrationPaused = true;
    if (!_started) return;
    await impl.logoutPush();
  }

  Future<void> logout() async {
    _hasSession = false;
    _registrationPaused = false;
    if (!_started) return;
    await impl.logoutPush();
  }
}
