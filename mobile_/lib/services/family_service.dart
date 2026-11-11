import 'package:dio/dio.dart';
import '../join_payload.dart';
import '../models/api_models.dart';
import 'api_client.dart';

/// Family, session profile, and invites.
class FamilyService {
  FamilyService(this._apiClient, {this.familyId});

  final ApiClient _apiClient;
  final String? familyId;

  FamilyService forFamily(String id) => FamilyService(_apiClient, familyId: id);

  Map<String, dynamic>? get _familyQuery => familyId == null ? null : {'familyId': familyId};


  Future<Map<String, dynamic>> getSession() async {
    try {
      final response = await _apiClient.dio.get('/api/auth/me');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> createFamily(String name) async {
    try {
      final response = await _apiClient.dio.post('/api/families', data: {'name': name});
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> createGroup(String name, {String? description}) async {
    final trimmedDescription = description?.trim();
    try {
      final response = await _apiClient.dio.post('/api/classes', data: {
        'name': name,
        if (trimmedDescription != null && trimmedDescription.isNotEmpty)
          'description': trimmedDescription,
      });
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> getMyFamily() async {
    try {
      final response = await _apiClient.dio.get('/api/families/my', queryParameters: _familyQuery);
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> updateMyFamily({
    required String name,
    required String? description,
  }) async {
    try {
      await _apiClient.dio.patch('/api/families/my', queryParameters: _familyQuery, data: {
        'name': name,
        'description': description,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> addGuardian(String email, {bool asAdmin = false}) async {
    try {
      await _apiClient.dio.post('/api/families/guardians', queryParameters: _familyQuery, data: {
        'email': email.trim().toLowerCase(),
        if (asAdmin) 'relation': 'Admin',
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Pass both [email] and [password] for an independent teen login.
  Future<Map<String, dynamic>> addChild({
    required String name,
    required int birthYear,
    String? email,
    String? password,
  }) async {
    try {
      final response = await _apiClient.dio.post('/api/families/children', queryParameters: _familyQuery, data: {
        'name': name,
        'birthYear': birthYear,
        if (email != null && email.isNotEmpty) 'email': email,
        if (password != null && password.isNotEmpty) 'password': password,
      });
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> requestDeletion({required String reason, required String password}) async {
    try {
      await _apiClient.dio.post(
        '/api/families/request-deletion', queryParameters: _familyQuery,
        data: {'reason': reason, 'password': password},
      );
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> cancelDeletion() async {
    try {
      await _apiClient.dio.post(
        '/api/families/cancel-deletion', queryParameters: _familyQuery,
        data: <String, dynamic>{},
      );
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
    String? password,
    String? phone,
  }) async {
    try {
      final response = await _apiClient.dio.patch(
        '/api/families/children/$childId/independent-login', queryParameters: _familyQuery,
        data: {
          'enabled': enabled,
          if (email != null) 'email': email,
          if (password != null) 'password': password,
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
        '/api/families/children/$childId/transition-to-adult', queryParameters: _familyQuery,
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
    try {
      final response = await _apiClient.dio.get('/api/memberships');
      return Map<String, dynamic>.from(response.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Description, creator, member count, total points and ranked standings for one group.
  Future<GroupDetail> getGroupDetail({required String kind, required String id}) async {
    try {
      final apiKind = membershipApiKind(kind);
      final response = await _apiClient.dio.get('/api/memberships/$apiKind/$id');
      return GroupDetail.fromJson(Map<String, dynamic>.from(response.data as Map));
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

  Future<void> acceptInvite(String raw, {String? childId}) async {
    final token = parseJoinToken(raw) ?? raw.trim();
    try {
      await _apiClient.dio.post('/api/invites/accept', data: {
        'token': token,
        if (childId != null && childId.isNotEmpty) 'childId': childId,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> leaveMembership({required String kind, required String id}) async {
    try {
      await _apiClient.dio.post('/api/memberships/leave', data: {
        'kind': membershipApiKind(kind),
        'id': id,
      });
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<Map<String, dynamic>> deleteGroup({required String kind, required String id}) async {
    try {
      final response = await _apiClient.dio.post('/api/memberships/delete', data: {
        'kind': membershipApiKind(kind),
        'id': id,
      });
      return Map<String, dynamic>.from(response.data as Map? ?? {'pending': true});
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  /// Report intake. [destination] `app` = Teen Bible Adventures only;
  /// `church` = ministry must respond and app admins also see it.
  Future<void> submitAppReport({
    required String message,
    required bool anonymous,
    String destination = 'app',
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
    final dest = destination == 'church' ? 'church' : 'app';
    final payload = <String, dynamic>{
      'message': trimmed,
      'anonymous': anonymous,
      'destination': dest,
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
    try {
      await _apiClient.dio.post('/api/reports', data: payload);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }
}
