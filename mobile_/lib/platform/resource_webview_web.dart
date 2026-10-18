// ignore_for_file: deprecated_member_use, avoid_web_libraries_in_flutter
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;
import 'package:flutter/material.dart';

class ResourceWebView extends StatefulWidget {
  const ResourceWebView({super.key, required this.url});
  final String url;
  @override
  State<ResourceWebView> createState() => _ResourceWebViewState();
}
class _ResourceWebViewState extends State<ResourceWebView> {
  static int _next = 0;
  late final String _viewType;
  @override
  void initState() {
    super.initState();
    _viewType = 'app-resource-${_next++}';
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (_) => html.IFrameElement()
      ..src = widget.url
      ..title = 'App resource'
      ..style.border = '0'
      ..style.width = '100%'
      ..style.height = '100%');
  }
  @override
  Widget build(BuildContext context) => HtmlElementView(viewType: _viewType);
}
