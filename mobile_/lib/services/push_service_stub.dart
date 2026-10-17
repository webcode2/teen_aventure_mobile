typedef PushTokenHandler = Future<void> Function(String token);

Future<void> startPush({
  required bool configured,
  required Object? options,
  PushTokenHandler? onToken,
}) async {}

Future<void> identifyPushUser(String? externalId) async {}

Future<void> logoutPush() async {}

Future<String?> currentPushSubscriptionId() async => null;
