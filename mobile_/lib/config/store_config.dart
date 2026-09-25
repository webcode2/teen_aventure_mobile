import 'package:flutter/foundation.dart';

/// Play Store / release gates.
/// Demo roles stay enabled while we are still client-testing release APKs.
class StoreConfig {
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const String firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
  static const String firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
  static const String firebaseMessagingSenderId =
      String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
  static const String firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');

  static bool get firebaseConfigured =>
      firebaseApiKey.isNotEmpty &&
      firebaseAppId.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseProjectId.isNotEmpty;

  /// Keep demo login shortcuts visible in release until Play Store ship.
  static bool showDemoRolesFor({required bool isRelease}) => true;

  static bool showOfflineDownloadFor({required bool isRelease}) => false;

  static bool hasRemoteApiFor({
    required bool isRelease,
    required String apiBaseUrl,
  }) {
    if (apiBaseUrl.isNotEmpty) return true;
    return !isRelease;
  }

  static bool get showDemoRoles => showDemoRolesFor(isRelease: kReleaseMode);

  static bool get showOfflineDownload =>
      showOfflineDownloadFor(isRelease: kReleaseMode);

  static bool get hasRemoteApi => hasRemoteApiFor(
        isRelease: kReleaseMode,
        apiBaseUrl: apiBaseUrl,
      );

}
