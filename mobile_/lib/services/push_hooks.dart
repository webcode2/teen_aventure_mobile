/// Session ↔ push wiring without importing the FCM plugin in tests.
class PushHooks {
  static Future<void> Function({String? userId, String? childId})? onSync;
  static Future<void> Function()? onLogout;

  static Future<void> sync({String? userId, String? childId}) async {
    await onSync?.call(userId: userId, childId: childId);
  }

  static Future<void> logout() async {
    await onLogout?.call();
  }

  static void unbind() {
    onSync = null;
    onLogout = null;
  }
}
