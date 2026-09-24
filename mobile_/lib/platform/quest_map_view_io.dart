import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import '../adventure_assets.dart';
import '../data/level_map_data.dart';
import '../theme.dart';

class QuestMapView extends StatefulWidget {
  const QuestMapView({
    super.key,
    required this.pins,
    required this.revealId,
    required this.onOpenLevel,
  });

  final List<QuestMapPin> pins;
  final int revealId;
  final ValueChanged<int> onOpenLevel;

  @override
  State<QuestMapView> createState() => _QuestMapViewState();
}

class _QuestMapViewState extends State<QuestMapView> {
  InAppWebViewController? _controller;
  String? _html;
  var _ready = false;
  var _failed = false;

  static bool get _webviewOk =>
      !kIsWeb &&
      (Platform.isAndroid ||
          Platform.isIOS ||
          Platform.isMacOS ||
          Platform.isWindows);

  @override
  void initState() {
    super.initState();
    if (_webviewOk) {
      rootBundle.loadString(AdventureAssets.questMap).then((raw) {
        if (!mounted) return;
        setState(() {
          _html = raw.replaceFirst('<html', '<html class="embed"');
        });
      });
    }
  }

  Future<void> _push({required bool levels, required bool reveal}) async {
    final controller = _controller;
    if (controller == null || !_ready || !mounted) return;
    if (levels) {
      final json = jsonEncode([for (final pin in widget.pins) pin.toJson()]);
      await controller.evaluateJavascript(source: 'QuestMap.setLevels($json);');
    }
    if (reveal) {
      await controller.evaluateJavascript(
        source: 'QuestMap.reveal(${widget.revealId});',
      );
    }
  }

  int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  void _open(Object? raw) {
    final id = _asInt(raw);
    if (id == null || !mounted) return;
    widget.onOpenLevel(id);
  }

  @override
  void didUpdateWidget(covariant QuestMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final levelsChanged = !listEquals(oldWidget.pins, widget.pins);
    final revealChanged = oldWidget.revealId != widget.revealId;
    if (levelsChanged || revealChanged) {
      unawaited(_push(levels: levelsChanged, reveal: revealChanged));
    }
  }

  @override
  void dispose() {
    _controller = null;
    _ready = false;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const sky = Color(0xFFB9E6F4);
    if (!_webviewOk || _failed) {
      return const ColoredBox(
        color: sky,
        child: Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'Open Quest on Chrome, Android, or iOS to travel the map.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.navy,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ),
      );
    }
    final html = _html;
    if (html == null) return const ColoredBox(color: sky);
    return ColoredBox(
      color: sky,
      child: InAppWebView(
        initialData: InAppWebViewInitialData(
          data: html,
          mimeType: 'text/html',
          encoding: 'utf-8',
        ),
        initialSettings: InAppWebViewSettings(
          javaScriptEnabled: true,
          transparentBackground: true,
          disableHorizontalScroll: true,
          supportZoom: false,
          disableContextMenu: true,
        ),
        onWebViewCreated: (controller) {
          _controller = controller;
          controller.addJavaScriptHandler(
            handlerName: 'openLevel',
            callback: (args) {
              if (!mounted || args.isEmpty) return null;
              _open(args.first);
              return null;
            },
          );
        },
        onLoadStop: (controller, url) async {
          _ready = true;
          await _push(levels: true, reveal: true);
        },
        onReceivedError: (controller, request, error) {
          if (!mounted) return;
          setState(() => _failed = true);
        },
      ),
    );
  }
}
