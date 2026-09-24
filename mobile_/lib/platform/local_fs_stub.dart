import 'package:video_player/video_player.dart';

Future<bool> localFileExists(String path) async => false;

bool localFileExistsSync(String path) => false;

Future<void> deleteLocalFile(String path) async {}

Future<String?> createAppDownloadDir(String folderName) async => null;

VideoPlayerController? createFileVideoController(String path) => null;
