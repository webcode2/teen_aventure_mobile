import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/platform/quest_map_document.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('native quest document embeds scenery instead of relative image requests', () async {
    final document = await loadQuestMapDocument();
    expect(document, contains('<html class="embed"'));
    expect(document, contains('data:image/webp;base64,UklGR'));
    expect(document, isNot(contains("url('quest_world.webp')")));
    expect(document, contains('window.QuestMap='));
    expect(document, isNot(contains('fonts.googleapis.com')));
  });
}
