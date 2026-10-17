import 'dart:io';

import 'package:flutter/widgets.dart';
import 'package:path_provider/path_provider.dart';

const heroImageUsesFiles = true;

ImageProvider heroImageProvider({
  required String asset,
  required String url,
  String? filePath,
}) {
  if (heroImageReady(filePath)) return FileImage(File(filePath!));
  if (url.isNotEmpty) return NetworkImage(url);
  return AssetImage(asset);
}

bool heroImageReady(String? filePath) {
  if (filePath == null || filePath.isEmpty) return false;
  return File(filePath).existsSync();
}

Future<String?> saveHeroImage(String name, List<int> bytes) async {
  final dir = await getApplicationDocumentsDirectory();
  final file = File('${dir.path}/hero_${name}_${DateTime.now().millisecondsSinceEpoch}.img');
  await file.writeAsBytes(bytes, flush: true);
  return file.path;
}

Future<void> deleteHeroImage(String? filePath) async {
  if (filePath == null || filePath.isEmpty) return;
  final file = File(filePath);
  if (await file.exists()) await file.delete();
}
