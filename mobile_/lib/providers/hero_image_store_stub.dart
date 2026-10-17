import 'package:flutter/widgets.dart';

const heroImageUsesFiles = false;

ImageProvider heroImageProvider({
  required String asset,
  required String url,
  String? filePath,
}) {
  if (url.isNotEmpty) return NetworkImage(url);
  return AssetImage(asset);
}

bool heroImageReady(String? filePath) => false;

Future<String?> saveHeroImage(String name, List<int> bytes) async => null;

Future<void> deleteHeroImage(String? filePath) async {}
