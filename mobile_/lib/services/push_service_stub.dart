Future<void> startPush({
  required bool configured,
  required Object? options,
}) async {}

Future<void> identifyPushUser(String? externalId) async {}

Future<void> logoutPush() async {}

Future<String?> currentPushSubscriptionId() async => null;
