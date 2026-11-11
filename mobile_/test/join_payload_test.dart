import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/join_payload.dart';

void main() {
  test('durable passes are web links any phone camera can open', () {
    expect(encodeChurchJoinCode('m10ghy'), 'https://tba.elastrocloud.com/join/church/M10GHY');
    expect(encodeClassJoinCode('8gigjx'), 'https://tba.elastrocloud.com/join/class/8GIGJX');
  });

  test('the in-app scanner reads join links and older printed codes', () {
    expect(parseJoinToken('https://tba.elastrocloud.com/join/church/m10ghy'), 'church:M10GHY');
    expect(parseJoinToken('https://tba.elastrocloud.com/join/class/8GIGJX?ref=x'), 'class:8GIGJX');
    expect(parseJoinToken('tba-join:church:M10GHY'), 'church:M10GHY');
    expect(parseJoinToken('*M10GHY*'), 'M10GHY');
  });
}
