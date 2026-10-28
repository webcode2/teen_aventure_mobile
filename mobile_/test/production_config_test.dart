import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/config/api_config.dart';
void main() {
  test('defaults to the deployed HTTPS origin and supports explicit build overrides', () {
    expect(ApiConfig.environment, ApiEnvironment.live);
    expect(ApiConfig.liveBaseUrl, 'https://tba.elastrocloud.com');
    const override = String.fromEnvironment('API_BASE_URL');
    expect(ApiConfig.baseUrl, override.isEmpty ? ApiConfig.liveBaseUrl : override);
    expect(ApiConfig.webBaseUrl, const String.fromEnvironment('WEB_BASE_URL', defaultValue: 'https://tba.elastrocloud.com'));
  });
}
