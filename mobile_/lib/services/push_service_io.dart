import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'push_hooks.dart';
import 'push_event_deduplicator.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

typedef PushTokenHandler = Future<void> Function(String token);

PushTokenHandler? _onToken;
StreamSubscription<String>? _tokenRefreshSub;
StreamSubscription<RemoteMessage>? _receivedSub;
StreamSubscription<RemoteMessage>? _openedSub;
final _events = PushEventDeduplicator();

Future<void> _emit(RemoteMessage message, {required bool opened}) async {
  final id = message.data['eventId']?.toString() ?? message.messageId;
  if (!await _events.accept(id, opened: opened)) return;
  if (opened) {
    PushHooks.emitOpened(_notice(message));
  } else {
    PushHooks.emitReceived(_notice(message));
  }
}

Future<void> startPush({
  required bool configured,
  required FirebaseOptions? options,
  PushTokenHandler? onToken,
}) async {
  _onToken = onToken;
  if (!configured || options == null) return;
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: options);
  }
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  // Android 13+ needs the runtime notification permission or FCM is silent.
  final settings = await FirebaseMessaging.instance.requestPermission(
    alert: true,
    badge: true,
    sound: true,
  );
  if (kDebugMode) {
    debugPrint('PushService: permission=${settings.authorizationStatus}');
    await FirebaseMessaging.instance.setAutoInitEnabled(true);
  }
  await _receivedSub?.cancel();
  await _openedSub?.cancel();
  _receivedSub = FirebaseMessaging.onMessage.listen((m) => unawaited(_emit(m, opened: false)));
  _openedSub = FirebaseMessaging.onMessageOpenedApp.listen((m) => unawaited(_emit(m, opened: true)));
  final launch = await FirebaseMessaging.instance.getInitialMessage();
  if (launch != null) await _emit(launch, opened: true);

  await _tokenRefreshSub?.cancel();
  _tokenRefreshSub = FirebaseMessaging.instance.onTokenRefresh.listen((token) {
    final handler = _onToken;
    if (handler == null || token.isEmpty) return;
    unawaited(handler(token));
  });

  // Initial token (onTokenRefresh only fires on rotation).
  try {
    final token = await FirebaseMessaging.instance.getToken();
    final handler = _onToken;
    if (handler != null && token != null && token.isNotEmpty) {
      unawaited(handler(token));
    }
  } catch (_) {}
}

PushNotice _notice(RemoteMessage message) => PushNotice.fromParts(
      title: message.notification?.title,
      body: message.notification?.body,
      data: message.data,
    );

Future<void> identifyPushUser(String? externalId) async {}

Future<void> logoutPush() async {
  await _receivedSub?.cancel();
  await _openedSub?.cancel();
  _receivedSub = null;
  _openedSub = null;
  await _tokenRefreshSub?.cancel();
  _tokenRefreshSub = null;
  _onToken = null;
  if (Firebase.apps.isEmpty) return;
  await FirebaseMessaging.instance.deleteToken();
}

Future<String?> currentPushSubscriptionId() async {
  if (Firebase.apps.isEmpty) return null;
  return FirebaseMessaging.instance.getToken();
}
