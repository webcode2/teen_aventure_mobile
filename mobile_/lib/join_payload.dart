const joinScheme = 'tba-join:';
const joinUri = 'tba://join/';
/// Printed passes link here so any phone camera can open them; the Worker sends
/// people without the app to Google Play.
const joinLinkBase = 'https://tba.elastrocloud.com/join/';
const maxMemberships = 5;

String encodeJoinToken(String token) => '$joinScheme$token';

String encodeChurchJoinCode(String joinCode) =>
    '${joinLinkBase}church/${normalizeJoinCode(joinCode)}';

String encodeClassJoinCode(String joinCode) =>
    '${joinLinkBase}class/${normalizeJoinCode(joinCode)}';

String normalizeJoinCode(String raw) {
  var value = raw.trim();
  if (value.startsWith('*') || value.endsWith('*')) {
    value = value.replaceAll(RegExp(r'^\*+|\*+$'), '').trim();
  }
  return value.toUpperCase();
}

String? parseJoinToken(String raw) {
  var trimmed = raw.trim();
  if (trimmed.isEmpty) return null;

  final askhub = RegExp(r'^askhub://study/join\?code=([^&\s]+)', caseSensitive: false)
      .firstMatch(trimmed);
  if (askhub != null) {
    trimmed = askhub.group(1)!.trim();
  }

  final link = RegExp(r'^https?://[^/\s]+/join/([^?#\s]+)', caseSensitive: false)
      .firstMatch(trimmed);
  if (link != null) {
    trimmed = link.group(1)!;
  }

  if (trimmed.startsWith(joinScheme)) {
    trimmed = trimmed.substring(joinScheme.length).trim();
  } else if (trimmed.startsWith(joinUri)) {
    trimmed = trimmed.substring(joinUri.length).trim();
  }

  trimmed = trimmed.replaceAll(RegExp(r'^\*+|\*+$'), '').trim();
  if (trimmed.isEmpty) return null;

  final durable = RegExp(r'^(church|class)[/:](.+)$', caseSensitive: false).firstMatch(trimmed);
  if (durable != null) {
    return '${durable.group(1)!.toLowerCase()}:${normalizeJoinCode(durable.group(2)!)}';
  }

  if (RegExp(r'^[A-Za-z0-9]{4,12}$').hasMatch(trimmed)) {
    return normalizeJoinCode(trimmed);
  }

  return trimmed;
}

String joinKindLabel(String kind) {
  return switch (kind.toUpperCase()) {
    'FAMILY' => 'Family',
    'CHURCH' => 'Church',
    'CLASS' => 'Group',
    'CUSTOM' => 'Custom group',
    _ => kind,
  };
}

/// Membership detail/leave/delete APIs use CLASS for ClassGroup rows (CUSTOM/CHURCH circles).
String membershipApiKind(String kind) {
  final upper = kind.toUpperCase();
  if (upper == 'CUSTOM') return 'CLASS';
  return upper;
}

bool isChurchInviteKind(String? kind) {
  final value = kind?.toUpperCase();
  return value == 'CHURCH' || value == 'CLASS';
}
