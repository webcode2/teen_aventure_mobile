import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/demo_account.dart';
import '../models/api_models.dart';
import 'api_client.dart';

/// Auth Service for handling authentication flows
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

  AuthService(this._apiClient, this._secureStorage);

  /// Register a new parent/user
  Future<AuthResponse> registerParent({
    required String email,
    required String password,
    required String name,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/auth/register', data: {
        'email': email,
        'password': password,
        'name': name,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Login as parent/user
  Future<AuthResponse> loginParent({
    required String email,
    required String password,
  }) async {
    if (DemoAccount.enabled && DemoAccount.matchesParent(email, password)) {
      return loginDemoParent();
    }
    try {
      final response = await _apiClient.dio.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<AuthResponse> loginDemoParent() async {
    final authResponse = DemoAccount.parentAuth();
    await _storeAuthToken(authResponse);
    return authResponse;
  }

  Future<AuthResponse> loginDemoTeen() async {
    final authResponse = DemoAccount.teenAuth();
    await _storeAuthToken(authResponse);
    return authResponse;
  }

  Future<AuthResponse> loginDemoTeenSolo() async {
    final authResponse = DemoAccount.teenSoloAuth();
    await _storeAuthToken(authResponse);
    return authResponse;
  }

  Future<AuthResponse> loginDemoChild() async {
    final authResponse = DemoAccount.childAuth();
    await _storeAuthToken(authResponse);
    return authResponse;
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
    if (DemoAccount.enabled && DemoAccount.matchesChild(childId, pin)) {
      final authResponse = DemoAccount.familyPinAuth(childId);
      await _storeAuthToken(authResponse);
      return authResponse;
    }
    try {
      final response = await _apiClient.dio.post('/api/auth/child-pin', data: {
        'childId': childId,
        'pin': pin,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      if (DemoAccount.enabled &&
          DemoAccount.matchesChild(childId, pin) &&
          e.response == null) {
        final authResponse = DemoAccount.familyPinAuth(childId);
        await _storeAuthToken(authResponse);
        return authResponse;
      }
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> setChildPin({
    required String childId,
    required String pin,
  }) async {
    if (DemoAccount.enabled && DemoAccount.isDemoToken(await getAuthToken())) {
      return;
    }
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
    required String pin,
  }) async {
    if (DemoAccount.enabled && DemoAccount.matchesTeen(email, pin)) {
      final authResponse = DemoAccount.matchesTeenSolo(email, pin)
          ? DemoAccount.teenSoloAuth()
          : DemoAccount.teenAuth();
      await _storeAuthToken(authResponse);
      return authResponse;
    }
    try {
      final response = await _apiClient.dio.post('/api/auth/teen-login', data: {
        'email': email,
        'pin': pin,
      });
      final authResponse = AuthResponse.fromJson(response.data);
      await _storeAuthToken(authResponse);
      return authResponse;
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Parent switches into an under-age child profile (no PIN).
  Future<AuthResponse> switchToUnderageChild(String childId) async {
    await _stashParentRestoreIfNeeded();
      if (DemoAccount.enabled && DemoAccount.isDemoToken(await getAuthToken())) {
      final authResponse = childId == DemoAccount.samId
          ? DemoAccount.teenAuth()
          : childId == DemoAccount.teenSoloId
              ? DemoAccount.teenSoloAuth()
              : DemoAccount.childAuth();
      await _storeAuthToken(authResponse);
      return authResponse;
    }
    try {
      final response = await _apiClient.dio.post('/api/families/children/$childId/switch');
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

  /// Get stored auth token
  Future<String?> getAuthToken() async {
    return await _secureStorage.read(key: _userTokenKey);
  }

  /// Check if user is authenticated
  Future<bool> isAuthenticated() async {
    final token = await _secureStorage.read(key: _userTokenKey);
    return token != null && token.isNotEmpty;
  }

  /// Get user type (parent or child)
  Future<String?> getUserType() async {
    return await _secureStorage.read(key: _userTypeKey);
  }

  /// Get current user ID
  Future<String?> getUserId() async {
    return await _secureStorage.read(key: _userIdKey);
  }

  /// Get current child ID
  Future<String?> getChildId() async {
    return await _secureStorage.read(key: _childIdKey);
  }

  /// Get current family ID
  Future<String?> getFamilyId() async {
    return await _secureStorage.read(key: _familyIdKey);
  }

  /// Update name / email / password. Empty [password] leaves it unchanged.
  Future<void> updateProfile({
    required String name,
    required String email,
    String? password,
  }) async {
    if (DemoAccount.enabled && DemoAccount.isDemoToken(await getAuthToken())) {
      return;
    }
    try {
      final data = <String, dynamic>{
        'name': name.trim(),
        'email': email.trim(),
      };
      final pwd = password?.trim();
      if (pwd != null && pwd.isNotEmpty) data['password'] = pwd;
      await _apiClient.dio.put('/api/auth/me', data: data);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  static const String _pendingProfileKey = 'pending_profile_update';

  Future<void> savePendingProfileUpdate({
    required String name,
    required String email,
    String? password,
  }) async {
    final payload = <String, dynamic>{
      'name': name.trim(),
      'email': email.trim(),
    };
    final pwd = password?.trim();
    if (pwd != null && pwd.isNotEmpty) payload['password'] = pwd;
    // ponytail: password in secure store until upload; move to hashed server-side only
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
        password: pending['password'] as String?,
      );
      await clearPendingProfileUpdate();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Get current user/child info
  Future<Map<String, dynamic>?> getCurrentUserInfo() async {
    final userType = await getUserType();
    if (userType == 'parent') {
      return {
        'type': 'parent',
        'userId': await getUserId(),
      };
    } else if (userType == 'child') {
      return {
        'type': 'child',
        'childId': await getChildId(),
        'familyId': await getFamilyId(),
      };
    }
    return null;
  }

  /// Store auth token and user info
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