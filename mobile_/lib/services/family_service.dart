import 'package:dio/dio.dart';
import '../config/demo_account.dart';
import '../join_payload.dart';
import 'api_client.dart';

/// Family, session profile, and invites.
class FamilyService {
  FamilyService(this._apiClient);

  final ApiClient _apiClient;

  Future<Map<String, dynamic>> getSession() async {
    if (_apiClient.isDemoSession) {
      return DemoAccount.sessionForToken(_apiClient.getAuthToken());
    }
    try {
      final response = await _apiClient.dio.get('/api/auth/me');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> createFamily(String name) async {
    if (_apiClient.isDemoSession) {
      return DemoAccount.createDemoFamily(name);
    }
    try {
      final response = await _apiClient.dio.post('/api/families', data: {'name': name});
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> createGroup(String name) async {
    if (_apiClient.isDemoSession) return DemoAccount.createDemoGroup(name);
    try {
      final response = await _apiClient.dio.post('/api/classes', data: {'name': name});
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> joinChurch(String joinCode) async {
    if (_apiClient.isDemoSession) {
      return DemoAccount.joinDemoChurch(joinCode);
    }
    try {
      final response = await _apiClient.dio.post('/api/families/join-church', data: {'joinCode': joinCode});
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getMyFamily() async {
    if (_apiClient.isDemoSession) return DemoAccount.familyJson();
    try {
      final response = await _apiClient.dio.get('/api/families/my');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> addChild({required String name, String ageBand = 'CHILD'}) async {
    try {
      final response = await _apiClient.dio.post('/api/families/children', data: {
        'name': name,
        'ageBand': ageBand,
      });
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> requestDeletion() async {
    try {
      await _apiClient.dio.post('/api/families/request-deletion');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> cancelDeletion() async {
    try {
      await _apiClient.dio.post('/api/families/cancel-deletion');
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> setJurisdiction(String jurisdiction) async {
    try {
      await _apiClient.dio.patch('/api/families/jurisdiction', data: {'jurisdiction': jurisdiction});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> enableIndependentLogin({
    required String childId,
    required bool enabled,
    String? email,
    String? pin,
    String? phone,
  }) async {
    try {
      final response = await _apiClient.dio.patch(
        '/api/families/children/$childId/independent-login',
        data: {
          'enabled': enabled,
          if (email != null) 'email': email,
          if (pin != null) 'pin': pin,
          if (phone != null) 'phone': phone,
        },
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> transitionToAdult({
    required String childId,
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '/api/families/children/$childId/transition-to-adult',
        data: {
          'email': email,
          'password': password,
          if (name != null) 'name': name,
        },
      );
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<List<Map<String, dynamic>>> consentPacks({String? jurisdiction}) async {
    try {
      final response = await _apiClient.dio.get('/api/consent/packs', queryParameters: {
        if (jurisdiction != null) 'jurisdiction': jurisdiction,
      });
      return (response.data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> acceptConsent({required String packId, String? childId}) async {
    try {
      await _apiClient.dio.post('/api/consent/accept', data: {
        'packId': packId,
        if (childId != null) 'childId': childId,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getMemberships() async {
    if (_apiClient.isDemoSession) {
      return DemoAccount.membershipsForToken(_apiClient.getAuthToken());
    }
    try {
      final response = await _apiClient.dio.get('/api/memberships');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> createInvite({
    required String kind,
    String? familyId,
    String? churchId,
    String? classId,
    String? email,
  }) async {
    if (_apiClient.isDemoSession) {
      if (kind == 'FAMILY') {
        throw ApiException(statusCode: 403, message: 'Family groups do not use invites');
      }
      final token = 'demoinvite${DateTime.now().millisecondsSinceEpoch}';
      return {
        'id': 'demo-invite',
        'kind': kind,
        'token': token,
        'payload': encodeJoinToken(token),
        'email': email,
        'name': 'Peterson Family',
        'expiresAt': DateTime.now().add(const Duration(days: 14)).toIso8601String(),
      };
    }
    try {
      final response = await _apiClient.dio.post('/api/invites', data: {
        'kind': kind,
        if (familyId != null) 'familyId': familyId,
        if (churchId != null) 'churchId': churchId,
        if (classId != null) 'classId': classId,
        if (email != null && email.isNotEmpty) 'email': email,
      });
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> previewInvite(String raw) async {
    final token = parseJoinToken(raw) ?? raw.trim();
    try {
      final response = await _apiClient.dio.get('/api/invites/${Uri.encodeComponent(token)}');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> acceptInvite(String raw) async {
    if (_apiClient.isDemoSession) return;
    final token = parseJoinToken(raw) ?? raw.trim();
    try {
      await _apiClient.dio.post('/api/invites/accept', data: {'token': token});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> leaveMembership({required String kind, required String id}) async {
    if (_apiClient.isDemoSession) {
      DemoAccount.leaveDemoMembership(kind: kind, id: id);
      return;
    }
    try {
      await _apiClient.dio.post('/api/memberships/leave', data: {'kind': kind, 'id': id});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> deleteGroup({required String kind, required String id}) async {
    if (_apiClient.isDemoSession) {
      return DemoAccount.deleteDemoGroup(kind: kind, id: id);
    }
    try {
      final response =
          await _apiClient.dio.post('/api/memberships/delete', data: {'kind': kind, 'id': id});
      return Map<String, dynamic>.from(response.data as Map? ?? {'pending': true});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// App-authority report. [anonymous] hides the reporter from public views;
  /// reporter fields are still stored for super-admin review and group linkage.
  Future<void> submitAppReport({
    required String message,
    required bool anonymous,
    String? followUpEmail,
    String? targetType,
    String? targetId,
    String? targetName,
    String? reporterId,
    String? reporterName,
    String? reporterEmail,
    String? reporterChildId,
    String? reporterFamilyId,
  }) async {
    final trimmed = message.trim();
    if (trimmed.isEmpty) {
      throw ApiException(statusCode: 400, message: 'Describe what happened');
    }
    final payload = <String, dynamic>{
      'message': trimmed,
      'anonymous': anonymous,
      if (followUpEmail != null && followUpEmail.trim().isNotEmpty) 'followUpEmail': followUpEmail.trim(),
      if (targetType != null) 'targetType': targetType,
      if (targetId != null) 'targetId': targetId,
      if (targetName != null) 'targetName': targetName,
      'reporter': {
        'id': reporterId,
        'name': reporterName,
        'email': reporterEmail,
        'childId': reporterChildId,
        'familyId': reporterFamilyId,
      },
    };
    if (_apiClient.isDemoSession) {
      DemoAccount.recordAppReport(payload);
      return;
    }
    try {
      await _apiClient.dio.post('/api/reports', data: payload);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
