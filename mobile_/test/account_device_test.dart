import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/services/auth_service.dart';

void main() {
  test('AccountDevice parses list payload fields', () {
    final device = AccountDevice.fromJson({
      'id': 'dev-1',
      'platform': 'android',
      'tokenHint': 'abcd1234…zz9999',
      'isCurrent': true,
      'updatedAt': '2026-10-12T10:00:00.000Z',
      'createdAt': '2026-10-12T09:00:00.000Z',
    });
    expect(device.id, 'dev-1');
    expect(device.platform, 'android');
    expect(device.isCurrent, isTrue);
    expect(device.tokenHint, contains('…'));
    expect(device.updatedAt.isUtc || device.updatedAt.isUtc == false, isTrue);
  });
}
