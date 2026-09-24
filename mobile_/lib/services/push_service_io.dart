import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {}

Future<void> startPush({
  required bool configured,
  required FirebaseOptions? options,
}) async {
  if (!configured || options == null) return;
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp(options: options);
  }
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
  await FirebaseMessaging.instance.requestPermission();
  if (kDebugMode) {
    await FirebaseMessaging.instance.setAutoInitEnabled(true);
  }
}

Future<void> identifyPushUser(String? externalId) async {}

Future<void> logoutPush() async {
  if (Firebase.apps.isEmpty) return;
  await FirebaseMessaging.instance.deleteToken();
}

Future<String?> currentPushSubscriptionId() async {
  if (Firebase.apps.isEmpty) return null;
  return FirebaseMessaging.instance.getToken();
}
