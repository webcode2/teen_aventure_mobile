import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:video_player/video_player.dart';
import '../../providers/video_provider.dart';
import '../../services/video_download_service.dart';
import '../../theme.dart';
import '../../platform/local_fs.dart';

class OfflineVideosScreen extends StatefulWidget {
  const OfflineVideosScreen({super.key});

  @override
  State<OfflineVideosScreen> createState() => _OfflineVideosScreenState();
}

class _OfflineVideosScreenState extends State<OfflineVideosScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VideoProvider>().getAllDownloadedVideos();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline Videos'),
        backgroundColor: TeenAppTheme.deepPurple,
        foregroundColor: Colors.white,
      ),
      body: Consumer<VideoProvider>(
        builder: (context, videoProvider, _) {
          return FutureBuilder<List<DownloadedVideo>>(
            future: videoProvider.getAllDownloadedVideos(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(child: Text('Error: ${snapshot.error}'));
              }

              final videos = snapshot.data ?? [];

              if (videos.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.download_for_offline_outlined, size: 64, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'No offline videos yet',
                        style: TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Download videos from the home screen to watch offline',
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: videos.length,
                itemBuilder: (context, index) {
                  final video = videos[index];
                  return _buildOfflineVideoCard(context, video, videoProvider);
                },
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildOfflineVideoCard(BuildContext context, DownloadedVideo video, VideoProvider provider) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: AppRadii.cardRadius),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: TeenAppTheme.deepPurple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.video_library, color: TeenAppTheme.deepPurple, size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        video.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Video ID: ${video.videoId}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _playOfflineVideo(context, video),
                    icon: const Icon(Icons.play_arrow),
                    label: const Text('Play Offline'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: TeenAppTheme.deepPurple,
                      side: const BorderSide(color: TeenAppTheme.deepPurple),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () => _deleteOfflineVideo(context, video, provider),
                    icon: const Icon(Icons.delete_outline),
                    label: const Text('Remove'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.red.shade400,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _playOfflineVideo(BuildContext context, DownloadedVideo video) {
    // Navigate to video player with local file
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => OfflineVideoPlayerScreen(video: video),
      ),
    );
  }

  Future<void> _deleteOfflineVideo(BuildContext context, DownloadedVideo video, VideoProvider provider) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Download'),
        content: Text('Remove "${video.title}" from offline videos?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Remove'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      await provider.deleteDownloadedVideo(video.videoId);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('${video.title} removed from offline videos')),
        );
      }
    }
  }
}

class OfflineVideoPlayerScreen extends StatefulWidget {
  final DownloadedVideo video;

  const OfflineVideoPlayerScreen({super.key, required this.video});

  @override
  State<OfflineVideoPlayerScreen> createState() => _OfflineVideoPlayerScreenState();
}

class _OfflineVideoPlayerScreenState extends State<OfflineVideoPlayerScreen> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;

  @override
  void initState() {
    super.initState();
    _initializeVideo();
  }

  Future<void> _initializeVideo() async {
    final controller = createFileVideoController(widget.video.localPath);
    if (controller == null) {
      return;
    }
    _controller = controller;
    await _controller!.initialize();
    await _controller!.setLooping(false);
    setState(() {
      _isInitialized = true;
    });
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.video.title),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
      ),
      body: !_isInitialized || _controller == null
          ? const Center(child: CircularProgressIndicator())
          : Center(
              child: AspectRatio(
                aspectRatio: _controller!.value.aspectRatio,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    VideoPlayer(_controller!),
                    _buildControls(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildControls() {
    final player = _controller;
    if (player == null) return const SizedBox.shrink();
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        VideoProgressIndicator(player, allowScrubbing: true),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: Icon(player.value.isPlaying ? Icons.pause : Icons.play_arrow, color: Colors.white, size: 32),
              onPressed: () {
                setState(() {
                  player.value.isPlaying ? player.pause() : player.play();
                });
              },
            ),
            const SizedBox(width: 16),
            IconButton(
              icon: const Icon(Icons.replay_10, color: Colors.white, size: 28),
              onPressed: () {
                final position = player.value.position - const Duration(seconds: 10);
                player.seekTo(position < Duration.zero ? Duration.zero : position);
              },
            ),
            const SizedBox(width: 16),
            IconButton(
              icon: const Icon(Icons.forward_10, color: Colors.white, size: 28),
              onPressed: () {
                final position = player.value.position + const Duration(seconds: 10);
                player.seekTo(position > player.value.duration ? player.value.duration : position);
              },
            ),
          ],
        ),
      ],
    );
  }
}