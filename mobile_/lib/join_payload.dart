const joinScheme = 'tba-join:';
const joinUri = 'tba://join/';
const maxMemberships = 5;

String encodeJoinToken(String token) => '$joinScheme$token';

String? parseJoinToken(String raw) {
  final trimmed = raw.trim();
  if (trimmed.isEmpty) return null;
  if (trimmed.startsWith(joinScheme)) {
    return trimmed.substring(joinScheme.length).trim();
  }
  if (trimmed.startsWith(joinUri)) {
    return trimmed.substring(joinUri.length).trim();
  }
  return trimmed;
}

String joinKindLabel(String kind) {
  return switch (kind) {
    'FAMILY' => 'Family',
    'CHURCH' => 'Church',
    'CLASS' => 'Group',
    _ => kind,
  };
}

bool isChurchInviteKind(String? kind) {
  final value = kind?.toUpperCase();
  return value == 'CHURCH' || value == 'CLASS';
}
