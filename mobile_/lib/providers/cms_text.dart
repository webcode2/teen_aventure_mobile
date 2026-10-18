import 'package:flutter/widgets.dart';
import 'package:provider/provider.dart';
import 'hero_copy.dart';

/// Existing copy remains the fallback in tests, old payloads and offline installs.
String cmsText(BuildContext context, String section, String key, String fallback) {
  try { return context.watch<HeroCopyController>().text(section, key, fallback); }
  catch (_) { return fallback; }
}
