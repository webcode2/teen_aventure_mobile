import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import 'hero_copy.dart';

/// Existing copy remains the fallback in tests, old payloads and offline installs.
String cmsText(BuildContext context, String section, String key, String fallback) {
  try { return context.watch<HeroCopyController>().text(section, key, fallback); }
  catch (_) { return fallback; }
}

/// Pull-to-refresh on any screen re-reads the live dashboard, including maintenance.
Future<void> refreshDashboardCopy(BuildContext context) async {
  try { await context.read<HeroCopyController>().refresh(); }
  catch (_) {}
}
