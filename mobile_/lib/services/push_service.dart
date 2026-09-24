import 'package:firebase_core/firebase_core.dart';
import '../config/store_config.dart';
import 'api_client.dart';
import 'push_service_stub.dart' if (dart.library.io) 'push_service_io.dart' as impl;

/// FCM push. No-ops on web or when Firebase dart-defines are unset.
class PushService {
  PushService(this._apiClient);

  final ApiClient _apiClient;
  bool _started = false;

  FirebaseOptions? get _options {
    if (!StoreConfig.firebaseConfigured) return null;
    return FirebaseOptions(
      apiKey: StoreConfig.firebaseApiKey,
      appId: StoreConfig.firebaseAppId,
      messagingSenderId: StoreConfig.firebaseMessagingSenderId,
      projectId: StoreConfig.firebaseProjectId,
    );
  }

  Future<void> start() async {
    if (_started) return;
    await impl.startPush(configured: StoreConfig.firebaseConfigured, options: _options);
    _started = StoreConfig.firebaseConfigured;
  }

  Future<void> syncIdentity({String? userId, String? childId}) async {
    if (!_started && !StoreConfig.firebaseConfigured) return;
    if (!_started) await start();
    final externalId = userId ?? childId;
    await impl.identifyPushUser(externalId);
    final token = await impl.currentPushSubscriptionId();
    if (token == null || token.isEmpty || externalId == null) return;
    try {
      await _apiClient.dio.post('/api/auth/push-subscription', data: {
        'fcmToken': token,
        'platform': 'android',
      });
    } catch (_) {}
  }

  Future<void> logout() async {
    if (!_started) return;
    await impl.logoutPush();
  }
}
