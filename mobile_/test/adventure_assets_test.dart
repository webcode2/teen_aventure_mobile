import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/adventure_assets.dart';

void main() {
  test('cleanAdventureSvg drops unsupported filter elements', () {
    const raw = '''
<svg xmlns="http://www.w3.org/2000/svg">
  <metadata><c2pa:manifest>secret</c2pa:manifest></metadata>
  <defs>
    <filter id="glow"><feColorMatrix values="1"/></filter>
  </defs>
  <g filter="url(#glow)"><rect width="10" height="10"/></g>
</svg>
''';

    final cleaned = cleanAdventureSvg(raw);

    expect(cleaned, isNot(contains('<metadata>')));
    expect(cleaned, isNot(contains('<filter')));
    expect(cleaned, isNot(contains('filter="')));
    expect(cleaned, contains('<rect width="10" height="10"/>'));
  });
}
