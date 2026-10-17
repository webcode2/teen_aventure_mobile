import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/services/api_client.dart';
import 'package:teen_aventure/services/auth_service.dart';

void main() {
  test('a locked parent sign-in keeps the lockout when teen login also fails', () async {
    SharedPreferences.setMockInitialValues({});
    final client = await ApiClient.create();
    client.dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final teen = options.path.contains('teen-login');
        handler.reject(DioException(
          requestOptions: options,
          type: DioExceptionType.badResponse,
          response: Response(
            requestOptions: options,
            statusCode: teen ? 401 : 429,
            data: {
              'message': teen
                  ? 'Invalid credentials or independent login disabled'
                  : 'Too many attempts. Try again in 15 minutes.',
            },
          ),
        ));
      },
    ));
    final auth = AuthService(client, const FlutterSecureStorage());

    expect(
      () => auth.loginParent(email: 'parent@askhub.test', password: 'password123'),
      throwsA(isA<ApiException>().having(
        (error) => error.message,
        'message',
        'Too many attempts. Try again in 15 minutes.',
      )),
    );
  });
}
