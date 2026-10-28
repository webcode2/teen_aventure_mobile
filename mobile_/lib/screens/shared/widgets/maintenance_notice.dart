import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../theme.dart';

/// Mirrors the CMS maintenance notice without discarding the current screen/session.
class MaintenanceNotice extends StatelessWidget {
  const MaintenanceNotice(
      {super.key, required this.enabled, required this.message});
  static const backgroundColor = Color(0xFF8C2433);

  final bool enabled;
  final String message;

  @override
  Widget build(BuildContext context) {
    if (!enabled) return const SizedBox.shrink();
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: TeenAppTheme.lightStatusBar,
      child: Semantics(
        container: true,
        liveRegion: true,
        child: Material(
          color: backgroundColor,
          child: SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.construction_outlined,
                      color: Colors.white, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        const Text('Maintenance',
                            style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w700,
                                fontSize: 13)),
                        const SizedBox(height: 3),
                        Text(message,
                            maxLines: 3,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 13,
                                height: 1.4)),
                      ])),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
