import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:video_player/video_player.dart';

Future<bool> localFileExists(String path) => File(path).exists();

bool localFileExistsSync(String path) => File(path).existsSync();

Future<void> deleteLocalFile(String path) async {
  final file = File(path);
  if (await file.exists()) {
    await file.delete();
  }
}

Future<String?> createAppDownloadDir(String folderName) async {
  Directory? directory;
  if (defaultTargetPlatform == TargetPlatform.android) {
    directory = await getExternalStorageDirectory();
  } else {
    directory = await getApplicationDocumentsDirectory();
  }
  if (directory == null) return null;
  final downloadDir = Directory('${directory.path}/$folderName');
  if (!await downloadDir.exists()) {
    await downloadDir.create(recursive: true);
  }
  return downloadDir.path;
}

VideoPlayerController? createFileVideoController(String path) {
  return VideoPlayerController.file(File(path));
}
