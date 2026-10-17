import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/services/api_client.dart';

DioException _response(Object? data, {int status = 400}) {
  final options = RequestOptions(path: '/api/auth/register');
  return DioException(
    requestOptions: options,
    response: Response(requestOptions: options, statusCode: status, data: data),
  );
}

void main() {
  test('shows the Zod issue message instead of the raw dump', () {
    const dump =
        '[\n  {\n    "origin": "string",\n    "code": "invalid_format",\n    "format": "email",\n    "message": "Invalid email address"\n  }\n]';
    expect(ApiException.fromDioError(_response({'message': dump})).message, 'Invalid email address');
  });

  test('keeps a normal server message', () {
    expect(
      ApiException.fromDioError(_response({'message': 'Email already registered'})).message,
      'Email already registered',
    );
  });
}
