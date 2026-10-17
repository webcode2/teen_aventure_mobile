import 'dart:async';

/// A push notification as the app sees it (title, body and the backend `type` tag).
class PushNotice {
  const PushNotice({
    this.title,
    this.body,
    this.type,
    this.imageUrl,
    this.actionLabel,
    this.actionUrl,
  });

  final String? title;
  final String? body;
  /// `nudge`, `class_message`, `group_deletion`, `family_deletion`, `account`, `safeguarding`.
  final String? type;
  final String? imageUrl;
  final String? actionLabel;
  final String? actionUrl;

  bool get hasActionUrl {
    final url = actionUrl?.trim() ?? '';
    return url.startsWith('http://') || url.startsWith('https://');
  }

  factory PushNotice.fromParts({String? title, String? body, Map<String, dynamic>? data}) {
    String? pick(String key) {
      final value = data?[key]?.toString().trim();
      return value == null || value.isEmpty ? null : value;
    }

    return PushNotice(
      title: title,
      body: body,
      type: pick('type'),
      imageUrl: pick('imageUrl'),
      actionLabel: pick('actionLabel'),
      actionUrl: pick('actionUrl'),
    );
  }
}

/// Session ↔ push wiring without importing the FCM plugin in tests.
class PushHooks {
  static Future<void> Function({String? userId, String? childId})? onSync;
  static Future<void> Function()? onLogout;

  static final StreamController<PushNotice> _received = StreamController<PushNotice>.broadcast();
  static final StreamController<PushNotice> _opened = StreamController<PushNotice>.broadcast();
  static PushNotice? _pendingOpen;

  /// Pushes that arrive while the app is open (Android does not show these itself).
  static Stream<PushNotice> get received => _received.stream;

  /// Pushes the user tapped from the system tray.
  static Stream<PushNotice> get opened => _opened.stream;

  static void emitReceived(PushNotice notice) => _received.add(notice);

  static void emitOpened(PushNotice notice) {
    if (_opened.hasListener) {
      _opened.add(notice);
    } else {
      _pendingOpen = notice;
    }
  }

  /// A tap that launched the app before any screen was listening.
  static PushNotice? takePendingOpen() {
    final notice = _pendingOpen;
    _pendingOpen = null;
    return notice;
  }

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
