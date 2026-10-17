import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/api_models.dart';
import 'api_client.dart';

/// Auth Service for handling authentication flows (live API only).
class AuthService {
  final ApiClient _apiClient;
  final FlutterSecureStorage _secureStorage;

  ApiClient get apiClient => _apiClient;

  static const String _userTokenKey = 'user_token';
  static const String _userTypeKey = 'user_type'; // 'parent', 'child'
  static const String _userIdKey = 'user_id';
  static const String _childIdKey = 'child_id';
  static const String _familyIdKey = 'family_id';
  static const String _parentRestoreTokenKey = 'parent_restore_token';
  static const String _pendingProfileKey = 'pending_profile_update';

  AuthService(this._apiClient, this._secureStorage);

  /// Register a new parent/user
  Future<AuthResponse> registerParent({
    required String email,
    required String password,
    required String name,
    required int birthYear,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/auth/register', data: {
        'email': email,
        'password': password,
        'name': name,
        'birthYear': birthYear,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Self-register a teen explorer (ages 15–19) with email + password.
  Future<AuthResponse> registerTeen({
    required String email,
    required String password,
    required String name,
    required int birthYear,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/auth/teen-register', data: {
        'email': email,
        'password': password,
        'name': name,
        'birthYear': birthYear,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Unified email/password sign-in for parents and standalone teens.
  /// Tries `/login` first, then `/teen-login` when that rejects (401/429).
  Future<AuthResponse> loginParent({
    required String email,
    required String password,
  }) async {
    try {
      return await _liveParent(email, password);
    } on DioException catch (e) {
      final code = e.response?.statusCode;
      if (code == 401 || code == 429) {
        try {
          return await _liveTeen(email, password);
        } on DioException catch (teenErr) {
          // A locked parent login is 429. Teen login then fails for that email;
          // keep the lockout instead of "invalid credentials".
          if (code == 429) throw ApiException.fromDioError(e);
          throw ApiException.fromDioError(teenErr);
        }
      }
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> _stashParentRestoreIfNeeded() async {
    final current = await getAuthToken();
    if (current != null && current.isNotEmpty && !(await canRestoreParent())) {
      await _secureStorage.write(key: _parentRestoreTokenKey, value: current);
    }
  }

  /// Child PIN login after a parent has already signed in.
  Future<AuthResponse> loginChildPin({
    required String childId,
    required String pin,
  }) async {
    await _stashParentRestoreIfNeeded();
    try {
      final response = await _apiClient.dio.post('/api/auth/child-pin', data: {
        'childId': childId,
        'pin': pin,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> setChildPin({
    required String childId,
    required String pin,
  }) async {
    try {
      await _apiClient.dio.put('/api/auth/children/$childId/pin', data: {
        'pin': pin,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Teen independent login
  Future<AuthResponse> loginTeenIndependent({
    required String email,
    required String password,
  }) async {
    try {
      return await _liveTeen(email, password);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Parent device → teen email/password. On success the parent session ends
  /// (no restore stash). Parent token stays until credentials are verified.
  Future<AuthResponse> loginTeenReplacingParent({
    required String email,
    required String password,
    String? expectedChildId,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/auth/teen-login', data: {
        'email': email.trim(),
        'password': password,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      final signedInId = authResponse.child?.id;
      if (expectedChildId != null &&
          expectedChildId.isNotEmpty &&
          signedInId != null &&
          signedInId != expectedChildId) {
        throw ApiException(
          message: 'That sign-in is for a different explorer. Use this explorer\'s email and password.',
        );
      }
      // End parent session on this device — no one-tap restore.
      await _secureStorage.delete(key: _parentRestoreTokenKey);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AuthResponse> _liveParent(String email, String password) async {
    final response = await _apiClient.dio.post('/api/auth/login', data: {
      'email': email.trim(),
      'password': password,
    });
    final authResponse = AuthResponse.fromJson(response.data);
    await _storeAuthToken(authResponse);
    return authResponse;
  }

  Future<AuthResponse> _liveTeen(String email, String password) async {
    final response = await _apiClient.dio.post('/api/auth/teen-login', data: {
      'email': email.trim(),
      'password': password,
    });
    final authResponse = AuthResponse.fromJson(response.data);
    await _storeAuthToken(authResponse);
    return authResponse;
  }

  /// Parent switches into an under-age child profile (no PIN on the server).
  Future<AuthResponse> switchToUnderageChild(String childId) async {
    await _stashParentRestoreIfNeeded();
    try {
      final response = await _apiClient.dio.post(
        '/api/families/children/$childId/switch',
        data: <String, dynamic>{},
      );
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<bool> canRestoreParent() async {
    final token = await _secureStorage.read(key: _parentRestoreTokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<void> restoreParentAccount() async {
    final token = await _secureStorage.read(key: _parentRestoreTokenKey);
    if (token == null || token.isEmpty) {
      throw ApiException(message: 'No parent account to return to');
    }
    await _secureStorage.write(key: _userTokenKey, value: token);
    await _secureStorage.write(key: _userTypeKey, value: 'parent');
    await _secureStorage.delete(key: _childIdKey);
    await _secureStorage.delete(key: _parentRestoreTokenKey);
    await _apiClient.setAuthToken(token);
  }

  /// Logout - clear stored tokens
  Future<void> logout() async {
    await _secureStorage.delete(key: _userTokenKey);
    await _secureStorage.delete(key: _userTypeKey);
    await _secureStorage.delete(key: _userIdKey);
    await _secureStorage.delete(key: _childIdKey);
    await _secureStorage.delete(key: _familyIdKey);
    await _secureStorage.delete(key: _parentRestoreTokenKey);
    await _apiClient.clearAuthToken();
  }

  Future<String?> getAuthToken() async {
    return await _secureStorage.read(key: _userTokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await _secureStorage.read(key: _userTokenKey);
    return token != null && token.isNotEmpty;
  }

  Future<String?> getUserType() async {
    return await _secureStorage.read(key: _userTypeKey);
  }

  Future<String?> getUserId() async {
    return await _secureStorage.read(key: _userIdKey);
  }

  Future<String?> getChildId() async {
    return await _secureStorage.read(key: _childIdKey);
  }

  Future<String?> getFamilyId() async {
    return await _secureStorage.read(key: _familyIdKey);
  }

  /// Update the signed-in profile. Changing email or password needs the current password.
  Future<void> updateProfile({
    required String name,
    required String email,
    String? password,
    String? currentPassword,
    int? birthYear,
  }) async {
    try {
      final data = <String, dynamic>{
        'name': name.trim(),
        'email': email.trim(),
      };
      void put(String key, String? value) {
        if (value != null && value.isNotEmpty) data[key] = value;
      }

      put('password', password);
      put('currentPassword', currentPassword);
      if (birthYear != null) data['birthYear'] = birthYear;
      await _apiClient.dio.put('/api/auth/me', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Offline queue for name-only edits; credential changes are never queued.
  Future<void> savePendingProfileUpdate({
    required String name,
    required String email,
  }) async {
    final payload = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
    };
    await _secureStorage.write(key: _pendingProfileKey, value: jsonEncode(payload));
  }

  Future<Map<String, dynamic>?> loadPendingProfileUpdate() async {
    final raw = await _secureStorage.read(key: _pendingProfileKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return Map<String, dynamic>.from(jsonDecode(raw) as Map);
    } catch (_) {
      await _secureStorage.delete(key: _pendingProfileKey);
      return null;
    }
  }

  Future<void> clearPendingProfileUpdate() async {
    await _secureStorage.delete(key: _pendingProfileKey);
  }

  /// Returns true when nothing is pending or upload succeeded.
  Future<bool> flushPendingProfileUpdate() async {
    final pending = await loadPendingProfileUpdate();
    if (pending == null) return true;
    try {
      await updateProfile(
        name: pending['name'] as String? ?? '',
        email: pending['email'] as String? ?? '',
      );
      await clearPendingProfileUpdate();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Devices registered for push for the signed-in identity.
  Future<List<AccountDevice>> listDevices({String? currentToken}) async {
    try {
      final response = await _apiClient.dio.get(
        '/api/auth/devices',
        queryParameters: {
          if (currentToken != null && currentToken.isNotEmpty) 'currentToken': currentToken,
        },
      );
      final items = response.data['items'];
      if (items is! List) return const [];
      return [
        for (final item in items)
          if (item is Map<String, dynamic>) AccountDevice.fromJson(item)
          else if (item is Map) AccountDevice.fromJson(Map<String, dynamic>.from(item)),
      ];
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> removeDevice(String deviceId) async {
    try {
      await _apiClient.dio.delete(
        '/api/auth/devices/$deviceId',
        options: Options(contentType: null),
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> _storeAuthToken(AuthResponse response) async {
    await _secureStorage.write(key: _userTokenKey, value: response.token);
    await _apiClient.setAuthToken(response.token);

    if (response.user != null) {
      await _secureStorage.write(key: _userTypeKey, value: 'parent');
      await _secureStorage.write(key: _userIdKey, value: response.user!.id);
    } else if (response.child != null) {
      await _secureStorage.write(key: _userTypeKey, value: 'child');
      await _secureStorage.write(key: _childIdKey, value: response.child!.id);
      await _secureStorage.write(key: _familyIdKey, value: response.child!.familyId);
    }
  }
}

class AccountDevice {
  const AccountDevice({
    required this.id,
    required this.platform,
    required this.tokenHint,
    required this.isCurrent,
    required this.updatedAt,
    this.createdAt,
  });

  final String id;
  final String platform;
  final String tokenHint;
  final bool isCurrent;
  final DateTime updatedAt;
  final DateTime? createdAt;

  factory AccountDevice.fromJson(Map<String, dynamic> json) {
    return AccountDevice(
      id: json['id']?.toString() ?? '',
      platform: json['platform']?.toString() ?? 'device',
      tokenHint: json['tokenHint']?.toString() ?? '',
      isCurrent: json['isCurrent'] == true,
      updatedAt: DateTime.tryParse(json['updatedAt']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0),
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? ''),
    );
  }
}
