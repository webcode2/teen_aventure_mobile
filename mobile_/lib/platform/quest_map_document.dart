import 'dart:convert';
import 'package:flutter/services.dart';

import '../adventure_assets.dart';

/// Native WebViews receive a self-contained document with bundled artwork.
/// Web loads the same HTML and adjacent texture through normal asset URLs.
Future<String> loadQuestMapDocument() async {
  final html = await rootBundle.loadString(AdventureAssets.questMap);
  final texture = await rootBundle.load('assets/maps/quest_world_light.webp');
  final bytes = texture.buffer.asUint8List(
    texture.offsetInBytes,
    texture.lengthInBytes,
  );
  return html
      .replaceFirst('<html', '<html class="embed"')
      .replaceAll("'quest_world_light.webp'", "'data:image/webp;base64,${base64Encode(bytes)}'");
}
