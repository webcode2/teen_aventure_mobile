import 'dart:async';
import 'dart:convert';
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import '../adventure_assets.dart';
import '../data/level_map_data.dart';

class QuestMapView extends StatefulWidget {
  const QuestMapView({
    super.key,
    this.copy = const {},
    required this.pins,
    required this.revealId,
    required this.onOpenLevel,
  });

  final Map<String, String> copy;
  final List<QuestMapPin> pins;
  final int revealId;
  final ValueChanged<int> onOpenLevel;

  @override
  State<QuestMapView> createState() => _QuestMapViewState();
}

class _QuestMapViewState extends State<QuestMapView> {
  late final String _viewType;
  html.IFrameElement? _iframe;
  StreamSubscription<html.MessageEvent>? _messages;
  StreamSubscription<html.Event>? _loads;
  var _ready = false;

  String get _origin => html.window.location.origin;

  @override
  void initState() {
    super.initState();
    _viewType = 'quest-map-${identityHashCode(this)}';
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      final iframe = html.IFrameElement()
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.backgroundColor = '#073C43';
      _loads = iframe.onLoad.listen((_) {
        if (!mounted) return;
        _ready = true;
        _push(levels: true, reveal: true);
      });
      _iframe = iframe;
      // Serve the bundled document over the app's HTTP origin. about:srcdoc
      // cannot be resolved by Flutter web's async stack-frame debugger.
      iframe.src = Uri.base
          .resolve('assets/${AdventureAssets.questMap}')
          .replace(queryParameters: {'embed': '1'})
          .toString();
      return iframe;
    });
    _messages = html.window.onMessage.listen(_onMessage);
  }

  void _onMessage(html.MessageEvent event) {
    if (event.origin != _origin) return;
    final data = _readMessage(event.data);
    if (data == null) return;
    if (data['source'] != 'quest-map') return;
    if (data['type'] == 'ready') {
      _ready = true;
      _push(levels: true, reveal: true);
      return;
    }
    if (data['type'] != 'openLevel') return;
    final id = _asInt(data['id']);
    if (id != null && mounted) widget.onOpenLevel(id);
  }

  Map<String, Object?>? _readMessage(Object? raw) {
    if (raw is String) {
      final decoded = jsonDecode(raw);
      if (decoded is Map) {
        return decoded.cast<String, Object?>();
      }
      return null;
    }
    if (raw is Map) return raw.cast<String, Object?>();
    return null;
  }

  int? _asInt(Object? value) {
    if (value is int) return value;
    if (value is num) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  void _push({required bool levels, required bool reveal}) {
    final win = _iframe?.contentWindow;
    if (win == null || !_ready) return;
    win.postMessage(jsonEncode({'type': 'setCopy', 'copy': widget.copy}), _origin);
    if (levels) {
      win.postMessage(
        jsonEncode({
          'type': 'setLevels',
          'levels': [for (final pin in widget.pins) pin.toJson()],
        }),
        _origin,
      );
    }
    if (reveal) {
      win.postMessage(jsonEncode({'type': 'reveal', 'id': widget.revealId}), _origin);
    }
  }

  @override
  void didUpdateWidget(covariant QuestMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final levelsChanged = !listEquals(oldWidget.pins, widget.pins);
    final revealChanged = oldWidget.revealId != widget.revealId;
    final copyChanged = !mapEquals(oldWidget.copy, widget.copy);
    if (levelsChanged || revealChanged || copyChanged) {
      _push(levels: levelsChanged, reveal: revealChanged);
    }
  }

  @override
  void dispose() {
    _messages?.cancel();
    _loads?.cancel();
    _iframe = null;
    _ready = false;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFF073C43),
      child: HtmlElementView(viewType: _viewType),
    );
  }
}
