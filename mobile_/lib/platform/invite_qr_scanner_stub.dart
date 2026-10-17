import 'package:flutter/material.dart';
import '../theme.dart';

typedef InviteQrDetected = void Function(String raw);

/// No-op controller for platforms without a CanvasKit-safe camera overlay.
class InviteQrScannerController {
  Future<void> start() async {}
  Future<void> stop() async {}
  Future<void> dispose() async {}
  Future<void> toggleTorch() async {}
  bool get torchOn => false;
  bool get isRunning => false;
  bool get hasCameraPermission => false;
  bool get hasError => false;
  bool get isStarting => false;
  String? get errorMessage => null;
}

InviteQrScannerController? createInviteQrScannerController() => null;

bool get inviteQrScannerSupported => false;

Widget buildInviteQrScanner({
  required InviteQrScannerController? controller,
  required InviteQrDetected onDetect,
  required bool busy,
  required bool paused,
  VoidCallback? onRetry,
  Key? key,
}) {
  return ClipRRect(
    borderRadius: AppRadii.cardRadius,
    child: AspectRatio(
      aspectRatio: 1,
      child: ColoredBox(
        color: AppColors.navy,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.qr_code_2_rounded, color: AppColors.cream, size: 48),
              const SizedBox(height: 12),
              const Text(
                'Scan on the phone app',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.cream,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Live camera QR uses a separate view that breaks Flutter web’s renderer. Paste the invite code here, or scan in the Android/iOS app.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.cream.withValues(alpha: 0.85),
                  height: 1.35,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
