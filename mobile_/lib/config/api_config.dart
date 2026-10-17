import 'package:flutter/foundation.dart';

enum ApiEnvironment { local, live, tunnel }

/// The single place that decides which backend the app talks to.
///
/// Going live: set [environment] to [ApiEnvironment.live] and rebuild.
/// A build-time `--dart-define=API_BASE_URL=https://...` still overrides everything.
class ApiConfig {
  static const ApiEnvironment environment = ApiEnvironment.tunnel;

  /// Cloudflare Tunnel domain (app.elastrocloud.com).
  static const String tunnelBaseUrl = 'https://app.elastrocloud.com';

  /// Production API (Traefik route in deploy/docker-compose.yml).
  static const String liveBaseUrl = 'https://api.teen.elastrocloud.com';

  /// Backend on your computer, reachable from a phone on the same Wi-Fi.
  /// Update when your computer's LAN IP changes (`hostname -I`). Release builds block
  /// plain HTTP, so use `flutter run` / debug builds when pointing a phone at this.
  static const String localNetworkBaseUrl = 'http://192.168.1.101:8080';

  /// Same machine as Chrome. Loopback stays available if the LAN address is down.
  static const String localWebBaseUrl = 'http://127.0.0.1:8080';

  static const String _override = String.fromEnvironment('API_BASE_URL');

  static String get baseUrl {
    if (_override.isNotEmpty) return _override;
    switch (environment) {
      case ApiEnvironment.tunnel:
        return tunnelBaseUrl;
      case ApiEnvironment.live:
        return liveBaseUrl;
      case ApiEnvironment.local:
        // Chrome on this machine → loopback. Phone on Wi-Fi → LAN IP.
        return kIsWeb ? localWebBaseUrl : localNetworkBaseUrl;
    }
  }

  static bool get isLive => _override.isEmpty && (environment == ApiEnvironment.live || environment == ApiEnvironment.tunnel);
}
