import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../platform/resource_webview.dart';
import '../../providers/hero_copy.dart';
import '../../theme.dart';

enum LegalDoc { privacy, terms, dataCollection, about, contact }

class LegalScreen extends StatefulWidget {
  const LegalScreen({super.key, required this.doc});
  final LegalDoc doc;
  @override
  State<LegalScreen> createState() => _LegalScreenState();
}

class _LegalScreenState extends State<LegalScreen> {
  static const _website = String.fromEnvironment('WEB_BASE_URL', defaultValue: 'https://teen.elastrocloud.com');
  static const _resources = {
    LegalDoc.privacy: ('privacyUrl', 'Privacy Policy', '/p/privacy-policy'),
    LegalDoc.terms: ('termsUrl', 'Terms & Conditions', '/p/terms-of-service'),
    LegalDoc.dataCollection: ('dataCollectionUrl', 'Data Collection', '/p/data-collection'),
    LegalDoc.about: ('aboutUrl', 'About Teen Bible Adventures', '/about'),
    LegalDoc.contact: ('contactUrl', 'Contact & Support', '/contact'),
  };
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) { if (mounted) context.read<HeroCopyController>().refresh(); });
  }
  @override
  Widget build(BuildContext context) {
    final (key, title, fallback) = _resources[widget.doc]!;
    final configured = context.watch<HeroCopyController>().text('legalLinks', key, fallback).trim();
    final uri = Uri.tryParse(configured);
    final resolved = uri != null && !configured.startsWith('//') ? Uri.parse(_website).resolveUri(uri) : null;
    final valid = resolved != null && ['https', 'http'].contains(resolved.scheme) && resolved.host.isNotEmpty;
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(backgroundColor: AppColors.navy, foregroundColor: AppColors.cream, title: Text(title)),
      body: valid ? ResourceWebView(key: ValueKey(resolved.toString()), url: resolved.toString()) : const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('This page is not configured correctly. Please contact support.'))),
    );
  }
}
