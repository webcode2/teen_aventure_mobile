/// Fallback when a sent cheer has no snapshot and the catalog has no match.
const fallbackNudgeMessage = 'A cheer from your family';

String messageForNudge(String stickerKey, {String? message}) {
  final trimmed = message?.trim();
  if (trimmed != null && trimmed.isNotEmpty) return trimmed;
  return fallbackNudgeMessage;
}
