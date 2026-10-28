import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';
import 'read_cache.dart';

/// API Client using Dio with interceptors for auth, error handling, and logging.
/// The backend address comes from [ApiConfig.baseUrl].
class ApiClient {

  // Chrome aborts before headers arrive. Achievements takes ~8s and the
  // current week ~3s on this database, so web uses the same limit as a phone.
  static Duration get _connectTimeout => const Duration(seconds: 15);
  static const Duration _receiveTimeout = Duration(seconds: 30);

  late final Dio _dio;
  final SharedPreferences _prefs;
  final AppReadCache _readCache;

  /// Session token, held in memory only. The durable copy lives in secure storage
  /// (AuthService); it is never written to SharedPreferences.
  String? _token;

  /// Called once when the server rejects the current session (401), e.g. the
  /// token expired or was revoked by a password change on another device.
  Future<void> Function()? onSessionExpired;

  ApiClient._(this._prefs, this._readCache, this._token) {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: _connectTimeout,
      receiveTimeout: _receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _setupInterceptors();
  }

  /// [initialToken] is the session restored from secure storage at startup.
  static Future<ApiClient> create({String? initialToken}) async {
    final prefs = await SharedPreferences.getInstance();
    // Older builds kept a plaintext copy of the token here.
    await prefs.remove(_legacyTokenKey);
    return ApiClient._(prefs, AppReadCache(PreferencesReadCacheStore(prefs)), initialToken);
  }

  static const String _legacyTokenKey = 'auth_token';

  Dio get dio => _dio;

  void _setupInterceptors() {
    // Auth interceptor - attaches token to requests
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (options.path.startsWith('/api/') && !options.path.startsWith('/api/v1/')) {
          options.path = options.path.replaceFirst('/api/', '/api/v1/');
        }
        // `authToken` in extra sends a different stored session (e.g. the parent
        // restore token at logout) without making it current.
        final token = options.extra['authToken'] as String? ?? _token;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        // Global Content-Type: application/json + empty body is rejected by Fastify
        // ("Body cannot be empty when content-type is set to application/json").
        // Strip the header for any method with no body (incl. parent→child switch POST).
        final noBody = options.data == null ||
            (options.data is String && (options.data as String).isEmpty);
        if (noBody) {
          options.headers.remove(Headers.contentTypeHeader);
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Handle 401 - token expired or invalid.
        // Child PIN checks use the parent JWT and return 401 for wrong/missing PIN;
        // clearing auth here would soft-logout the parent and break the no-PIN switch fallback.
        if (error.response?.statusCode == 401 &&
            !_isExpectedAuthChallenge(error.requestOptions.path) &&
            _sentCurrentToken(error.requestOptions)) {
          // Clear first so concurrent 401s from the same dead session fire once.
          await clearAuthToken();
          final expired = onSessionExpired;
          if (expired != null) {
            try {
              await expired();
            } catch (_) {}
          }
        }
        handler.next(error);
      },
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final cached = _cachedGet(options, fresh: true);
        if (cached != null) {
          options.extra['appCache'] = 'hit';
          handler.resolve(_cachedResponse(options, cached));
          return;
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        final options = response.requestOptions;
        if (options.extra['appCache'] != 'hit' &&
            options.method.toUpperCase() == 'GET' &&
            response.statusCode == 200) {
          _storeGet(options, response.data);
        }
        if (options.method.toUpperCase() != 'GET' && (response.statusCode ?? 500) < 400) {
          _readCache.invalidateScope(_personalScope());
        }
        handler.next(response);
      },
      onError: (error, handler) {
        final options = error.requestOptions;
        final status = error.response?.statusCode;
        final network = error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout ||
            error.type == DioExceptionType.connectionError ||
            (status != null && status >= 500);
        if (network) {
          final cached = _cachedGet(options, fresh: false);
          if (cached != null) {
            handler.resolve(_cachedResponse(options, cached));
            return;
          }
        }
        handler.next(error);
      },
    ));

    // Logging interceptor (debug only — never default-on in Play builds)
    if (kDebugMode) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        requestHeader: false,
        responseHeader: false,
        error: true,
      ));
    }

    // Retry interceptor for transient errors (bounded — fetch re-enters this interceptor)
    _dio.interceptors.add(InterceptorsWrapper(
      onError: (error, handler) async {
        final retries = error.requestOptions.extra['retryCount'] as int? ?? 0;
        if (!kIsWeb && _shouldRetry(error) && retries < 2) {
          error.requestOptions.extra['retryCount'] = retries + 1;
          await Future.delayed(const Duration(milliseconds: 500));
          try {
            final response = await _dio.fetch(error.requestOptions);
            handler.resolve(response);
            return;
          } catch (_) {
            // Retry failed, pass original error
          }
        }
        handler.next(error);
      },
    ));
  }

  bool _shouldRetry(DioException error) {
    // Retry on network errors or 5xx server errors
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.connectionError) {
      return true;
    }
    if (error.response?.statusCode != null &&
        error.response!.statusCode! >= 500 &&
        error.response!.statusCode! < 600) {
      return true;
    }
    return false;
  }

  /// Paths where 401 means "bad credentials for this action", not a dead session.
  bool _isExpectedAuthChallenge(String path) {
    final p = path.toLowerCase();
    return p.contains('/auth/child-pin') ||
        p.contains('/auth/login') ||
        p.contains('/auth/teen-login') ||
        // An already-revoked session at logout is fine; the sign-out is underway.
        p.contains('/auth/logout');
  }

  String _personalScope() {
    final token = _token ?? '';
    if (token.isEmpty) return 'p::';
    return 'p:${_readCache.storageId(token)}';
  }

  String? _cacheKey(RequestOptions options) {
    if (options.method.toUpperCase() != 'GET' || options.extra['skipCache'] == true) return null;
    final fresh = ReadCachePolicy.freshFor(options.path);
    if (fresh == null) return null;
    final scope = ReadCachePolicy.isPersonal(options.path) ? _personalScope() : 'shared';
    if (scope.startsWith('p:') && scope == 'p::') return null;
    return _readCache.entryKey(path: options.path, query: options.queryParameters, scope: scope);
  }

  Object? _cachedGet(RequestOptions options, {required bool fresh}) {
    final key = _cacheKey(options);
    if (key == null) return null;
    final ttl = fresh ? ReadCachePolicy.freshFor(options.path) : ReadCachePolicy.staleFor(options.path);
    if (ttl == null) return null;
    return fresh ? _readCache.fresh(key, ttl) : _readCache.stale(key, ttl);
  }

  void _storeGet(RequestOptions options, Object? body) {
    final key = _cacheKey(options);
    if (key == null) return;
    _readCache.save(key, body);
  }

  Response<dynamic> _cachedResponse(RequestOptions options, Object? body) {
    return Response(requestOptions: options, data: body, statusCode: 200);
  }

  /// Set auth token (called after login and on restore from secure storage)
  Future<void> setAuthToken(String token) async {
    // A rotated token gets a new personal cache scope; drop the old scope's entries.
    if (_token != null && _token != token) _readCache.invalidateScope(_personalScope());
    _token = token;
  }

  /// Clear auth token (called on logout)
  Future<void> clearAuthToken() async {
    _readCache.invalidateScope(_personalScope());
    _token = null;
    await _prefs.remove(_legacyTokenKey);
    await _prefs.remove('user_id');
    await _prefs.remove('user_role');
    await _prefs.remove('family_id');
    await _prefs.remove('child_id');
  }

  /// Get stored auth token
  String? getAuthToken() {
    return _token;
  }

  /// A 401 for a token we have since replaced (re-login) must not log the new session out.
  bool _sentCurrentToken(RequestOptions options) {
    final current = _token;
    if (current == null || current.isEmpty) return false;
    return options.headers['Authorization'] == 'Bearer $current';
  }

  /// Demo offline accounts were removed from the production app.
  bool get isDemoSession => false;

  /// Check if user is authenticated
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  /// Update base URL (useful for testing/staging)
  void updateBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final String? code;
  final Map<String, dynamic>? errors;

  ApiException({
    this.statusCode,
    required this.message,
    this.code,
    this.errors,
  });

  factory ApiException.fromDioError(DioException error) {
    if (error.response != null) {
      final data = error.response!.data;
      if (data is Map) {
        return ApiException(
          statusCode: error.response!.statusCode,
          message: _friendlyApiMessage(data['message']),
          code: data['code'] is String ? data['code'] as String : null,
          errors: data['errors'] is Map<String, dynamic>
              ? data['errors'] as Map<String, dynamic>
              : null,
        );
      }
      return ApiException(
        statusCode: error.response!.statusCode,
        message: _friendlyApiMessage(data),
      );
    }
    return ApiException(
      statusCode: null,
      message: _friendlyNetworkMessage(error),
    );
  }

  /// Turns Zod dumps and other raw payloads into a short line for the UI.
  static String _friendlyApiMessage(Object? raw) {
    if (raw == null) return 'Something went wrong. Please try again.';
    if (raw is List && raw.isNotEmpty) {
      final first = raw.first;
      if (first is Map && first['message'] is String) {
        return (first['message'] as String).trim();
      }
    }
    final text = raw.toString().trim();
    if (text.isEmpty) return 'Something went wrong. Please try again.';
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        final decoded = raw is String ? raw : text;
        // Zod issue dumps include "message":"…" — pull the first one.
        final match = RegExp(r'"message"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"').firstMatch(decoded);
        if (match != null) {
          return match.group(1)!.replaceAll(r'\"', '"').trim();
        }
      } catch (_) {}
      return 'Please check your details and try again.';
    }
    return text;
  }

  static String _friendlyNetworkMessage(DioException error) {
    final raw = error.message ?? '';
    final looksBlocked = raw.contains('XMLHttpRequest') ||
        raw.toLowerCase().contains('cors') ||
        error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout;
    if (looksBlocked) {
      return 'Could not reach the server. Check your connection and try again.';
    }
    if (raw.trim().isEmpty) return 'Network error';
    return raw;
  }

  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Result wrapper for API responses
class ApiResult<T> {
  final T? data;
  final ApiException? error;

  ApiResult.success(this.data) : error = null;
  ApiResult.failure(this.error) : data = null;

  bool get isSuccess => error == null;
  bool get isFailure => error != null;

  T getOrThrow() {
    if (isSuccess) return data!;
    throw error!;
  }
}