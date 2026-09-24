import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/demo_account.dart';
import '../config/store_config.dart';

/// API Client using Dio with interceptors for auth, error handling, and logging
/// IPv4 loopback so Chrome does not hit Docker's IPv6 bind on :8080.
const String debugWebApiBaseUrl = 'http://127.0.0.1:8080';

class ApiClient {
  static String get _baseUrl {
    if (StoreConfig.apiBaseUrl.isNotEmpty) return StoreConfig.apiBaseUrl;
    if (kReleaseMode) return '';
    // Android emulator loopback. Chrome/desktop cannot reach 10.0.2.2.
    // 127.0.0.1, not localhost: on Windows, localhost often resolves to ::1,
    // and Docker Desktop already owns IPv6 :8080 (returns 404 to the browser).
    if (kIsWeb) return debugWebApiBaseUrl;
    return 'http://10.0.2.2:8080';
  }

  static Duration get _connectTimeout =>
      kIsWeb ? const Duration(seconds: 3) : const Duration(seconds: 15);
  static const Duration _receiveTimeout = Duration(seconds: 30);

  late final Dio _dio;
  final SharedPreferences _prefs;

  ApiClient._(this._prefs) {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl.isEmpty ? 'https://localhost' : _baseUrl,
      connectTimeout: _connectTimeout,
      receiveTimeout: _receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _setupInterceptors();
  }

  static Future<ApiClient> create() async {
    final prefs = await SharedPreferences.getInstance();
    return ApiClient._(prefs);
  }

  Dio get dio => _dio;

  void _setupInterceptors() {
    // Auth interceptor - attaches token to requests
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = _prefs.getString('auth_token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        // Handle 401 - token expired or invalid
        if (error.response?.statusCode == 401) {
          // Clear stored auth
          await _prefs.remove('auth_token');
          await _prefs.remove('user_id');
          await _prefs.remove('user_role');
          await _prefs.remove('family_id');
          await _prefs.remove('child_id');
          // Could emit an event here for auth state change
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

  /// Set auth token (called after login)
  Future<void> setAuthToken(String token) async {
    await _prefs.setString('auth_token', token);
  }

  /// Clear auth token (called on logout)
  Future<void> clearAuthToken() async {
    await _prefs.remove('auth_token');
    await _prefs.remove('user_id');
    await _prefs.remove('user_role');
    await _prefs.remove('family_id');
    await _prefs.remove('child_id');
  }

  /// Get stored auth token
  String? getAuthToken() {
    return _prefs.getString('auth_token');
  }

  bool get isDemoSession => DemoAccount.isDemoToken(getAuthToken());

  /// Check if user is authenticated
  bool get isAuthenticated => _prefs.getString('auth_token') != null;

  /// Update base URL (useful for testing/staging)
  void updateBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }
}

/// Custom exception for API errors
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final Map<String, dynamic>? errors;

  ApiException({
    this.statusCode,
    required this.message,
    this.errors,
  });

  factory ApiException.fromDioError(DioException error) {
    if (error.response != null) {
      final data = error.response!.data;
      if (data is Map<String, dynamic>) {
        return ApiException(
          statusCode: error.response!.statusCode,
          message: data['message']?.toString() ?? 'An error occurred',
          errors: data['errors'] as Map<String, dynamic>?,
        );
      }
      return ApiException(
        statusCode: error.response!.statusCode,
        message: data?.toString() ?? 'An error occurred',
      );
    }
    return ApiException(
      statusCode: null,
      message: _friendlyNetworkMessage(error),
    );
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