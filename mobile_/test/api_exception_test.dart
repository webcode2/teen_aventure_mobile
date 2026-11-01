import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/services/api_client.dart';
import 'package:teen_aventure/services/error_text.dart';

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

  test('a proxy HTML error page never reaches the screen', () {
    const page = '<html><head><title>500 Server Error</title></head>'
        '<body><h1>Error: Server Error</h1></body></html>';
    expect(ApiException.fromDioError(_response(page, status: 500)).message, serverErrorText);
    expect(ApiException.fromDioError(_response(page, status: 404)).message, isNot(contains('<')));
  });

  test('server-side 500 messages are replaced, client errors keep theirs', () {
    expect(
      ApiException.fromDioError(_response({'message': 'TypeError: x is undefined'}, status: 500)).message,
      serverErrorText,
    );
    expect(ApiException.fromDioError(_response({'message': 'Invalid credentials'}, status: 401)).message, 'Invalid credentials');
  });

  test('timeouts and plain exceptions get safe text', () {
    final timeout = DioException(
      requestOptions: RequestOptions(path: '/x'),
      type: DioExceptionType.receiveTimeout,
      message: 'The request took longer than 0:00:30',
    );
    expect(errorText(timeout), timeoutErrorText);
    expect(errorText(StateError('ServiceLocator not initialized')), genericErrorText);
    expect(errorText(Exception('boom'), fallback: 'Could not load devices'), 'Could not load devices');
  });
}
