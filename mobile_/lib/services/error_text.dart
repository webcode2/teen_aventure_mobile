import 'package:dio/dio.dart';

import 'api_client.dart';

/// The one place that turns failures into text a user may see.
///
/// Raw server bodies (proxy HTML pages, stack traces, Zod dumps) and Dart
/// exception strings never reach the screen; only short server messages for
/// client errors (4xx) do, because those are written for people.

const String genericErrorText = 'Something went wrong. Please try again.';
const String serverErrorText =
    'Teen Bible Adventures is having trouble right now. Please try again in a moment.';
const String offlineErrorText =
    'Could not reach the server. Check your connection and try again.';
const String timeoutErrorText =
    'The server took too long to respond. Please try again.';

/// Text for any caught error. [fallback] replaces the generic line for errors
/// that carry no safe message (bugs, platform exceptions).
String errorText(Object? error, {String fallback = genericErrorText}) {
  if (error is ApiException) return error.message;
  if (error is DioException) return ApiException.fromDioError(error).message;
  return fallback;
}

/// Message for an HTTP failure. [serverMessage] is the JSON `message` field, if any.
String httpErrorText(int? status, Object? serverMessage) {
  if (status != null && status >= 500) return serverErrorText;
  final readable = _readable(serverMessage);
  if (readable != null) return readable;
  return switch (status) {
    400 || 422 => 'Please check your details and try again.',
    401 => 'Please sign in again.',
    403 => "You don't have access to that.",
    404 => "We couldn't find that. It may have been removed.",
    408 => timeoutErrorText,
    409 => 'That was changed somewhere else. Refresh and try again.',
    413 => 'That file is too large.',
    // Our API always words its own 429s, so a bare one is the hosting layer at capacity.
    429 => serverErrorText,
    _ => genericErrorText,
  };
}

/// Message for a request that got no HTTP response.
String networkErrorText(DioException error) {
  return switch (error.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.receiveTimeout =>
      timeoutErrorText,
    DioExceptionType.cancel => 'The request was cancelled.',
    DioExceptionType.badCertificate =>
      'Could not make a secure connection. Check your network and try again.',
    _ => offlineErrorText,
  };
}

const int _maxMessageLength = 200;

/// A server message is shown only when it reads like a sentence for people.
String? _readable(Object? raw) {
  if (raw is List && raw.isNotEmpty) {
    final first = raw.first;
    return first is Map ? _readable(first['message']) : null;
  }
  if (raw is! String) return null;
  final text = raw.trim();
  if (text.isEmpty) return null;
  // Markup, JSON, or stack frames mean an unformatted body, not a message.
  final unformatted = RegExp(r'[<>{}\[\]]|\bat .+:\d+').hasMatch(text);
  final message = unformatted ? _zodMessage(text) : text;
  return message == null || message.length > _maxMessageLength ? null : message;
}

/// Zod issue dumps arrive as a JSON string; pull out the first human message.
String? _zodMessage(String text) {
  final match =
      RegExp(r'"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"').firstMatch(text);
  final message = match?.group(1)?.replaceAll(r'\"', '"').trim();
  return message == null || message.isEmpty ? null : message;
}
