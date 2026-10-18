import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class ResourceWebView extends StatefulWidget {
  const ResourceWebView({super.key, required this.url});
  final String url;
  @override
  State<ResourceWebView> createState() => _ResourceWebViewState();
}
class _ResourceWebViewState extends State<ResourceWebView> {
  bool _loading = true;
  bool _failed = false;
  int _retry = 0;
  bool _allowed(String value) => ['https', 'http'].contains(Uri.tryParse(value)?.scheme);
  @override
  Widget build(BuildContext context) => Stack(children: [
    InAppWebView(
      key: ValueKey('${widget.url}:$_retry'),
      initialUrlRequest: URLRequest(url: WebUri(widget.url)),
      initialSettings: InAppWebViewSettings(javaScriptEnabled: true, useShouldOverrideUrlLoading: true, supportMultipleWindows: false),
      shouldOverrideUrlLoading: (_, action) async => _allowed(action.request.url.toString()) ? NavigationActionPolicy.ALLOW : NavigationActionPolicy.CANCEL,
      onLoadStart: (_, __) { if (mounted) setState(() => _loading = true); },
      onLoadStop: (_, __) { if (mounted) setState(() => _loading = false); },
      onReceivedError: (_, request, __) { if (request.isForMainFrame == true && mounted) setState(() { _failed = true; _loading = false; }); },
      onReceivedHttpError: (_, request, response) { if (request.isForMainFrame == true && (response.statusCode ?? 0) >= 400 && mounted) setState(() { _failed = true; _loading = false; }); },
    ),
    if (_loading && !_failed) const Center(child: CircularProgressIndicator()),
    if (_failed) Positioned.fill(child: ColoredBox(color: Theme.of(context).scaffoldBackgroundColor, child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
      const Padding(padding: EdgeInsets.all(24), child: Text('This page is unavailable. Check your connection and try again.', textAlign: TextAlign.center)),
      FilledButton(onPressed: () => setState(() { _failed = false; _loading = true; _retry++; }), child: const Text('Try again')),
    ])))),
  ]);
}
