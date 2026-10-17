import 'dart:async';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme.dart';

typedef InviteQrDetected = void Function(String raw);

class InviteQrScannerController {
  InviteQrScannerController()
      : _inner = MobileScannerController(
          // autoStart stays false — JoinInviteScreen starts after the first frame
          // so the Activity / texture are ready (release CameraX is picky).
          autoStart: false,
          detectionSpeed: DetectionSpeed.normal,
          facing: CameraFacing.back,
          formats: const [BarcodeFormat.qrCode],
        );

  final MobileScannerController _inner;
  bool _torchOn = false;
  Future<void>? _startInFlight;

  Future<void> start() async {
    if (_inner.value.isRunning) return;
    final inFlight = _startInFlight;
    if (inFlight != null) {
      await inFlight;
      return;
    }
    final done = Completer<void>();
    _startInFlight = done.future;
    try {
      if (_inner.value.error != null) return;
      await _inner.start();
    } on MobileScannerException catch (error) {
      if (error.errorCode == MobileScannerErrorCode.controllerAlreadyInitialized) {
        return;
      }
      rethrow;
    } finally {
      if (!done.isCompleted) done.complete();
      _startInFlight = null;
    }
  }

  Future<void> stop() async {
    if (_startInFlight != null) return;
    if (!_inner.value.isInitialized || !_inner.value.isRunning) return;
    try {
      await _inner.stop();
    } catch (_) {}
  }

  Future<void> dispose() async {
    try {
      await stop();
    } catch (_) {}
    await _inner.dispose();
  }

  Future<void> toggleTorch() async {
    if (!_inner.value.isRunning) return;
    await _inner.toggleTorch();
    _torchOn = !_torchOn;
  }

  bool get torchOn => _torchOn;
  bool get isRunning => _inner.value.isRunning;
  bool get hasCameraPermission => _inner.value.hasCameraPermission;
  bool get hasError => _inner.value.error != null;
  bool get isStarting => _startInFlight != null;
  String? get errorMessage => _inner.value.error?.errorDetails?.message;

  MobileScannerController get raw => _inner;
}

InviteQrScannerController? createInviteQrScannerController() =>
    InviteQrScannerController();

bool get inviteQrScannerSupported => true;

Widget buildInviteQrScanner({
  required InviteQrScannerController? controller,
  required InviteQrDetected onDetect,
  required bool busy,
  required bool paused,
  VoidCallback? onRetry,
  Key? key,
}) {
  if (controller == null) return const SizedBox.shrink();
  return _QrScannerFrame(
    key: key,
    controller: controller.raw,
    onDetect: (capture) {
      for (final barcode in capture.barcodes) {
        final value = barcode.rawValue?.trim();
        if (value == null || value.isEmpty) continue;
        onDetect(value);
        return;
      }
    },
    busy: busy,
    paused: paused,
    onRetry: onRetry,
  );
}

class _QrScannerFrame extends StatelessWidget {
  const _QrScannerFrame({
    super.key,
    required this.controller,
    required this.onDetect,
    required this.busy,
    required this.paused,
    this.onRetry,
  });

  final MobileScannerController controller;
  final void Function(BarcodeCapture capture) onDetect;
  final bool busy;
  final bool paused;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: AppRadii.cardRadius,
      child: AspectRatio(
        aspectRatio: 1,
        child: Stack(
          fit: StackFit.expand,
          children: [
            ColoredBox(
              color: AppColors.navy,
              child: MobileScanner(
                controller: controller,
                onDetect: onDetect,
                errorBuilder: (context, error, child) {
                  final denied =
                      error.errorCode == MobileScannerErrorCode.permissionDenied;
                  final detail = error.errorDetails?.message?.trim();
                  return ColoredBox(
                    color: AppColors.navy,
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.camera_alt_outlined, color: AppColors.cream, size: 40),
                          const SizedBox(height: 12),
                          const Text(
                            'Camera unavailable',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.cream,
                              fontWeight: FontWeight.w900,
                              fontSize: 16,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            denied
                                ? 'Camera permission was denied. Enable it in system settings, or paste the invite code below.'
                                : 'Could not open the camera. Tap try again, or paste the invite code below.'
                                    '${detail != null && detail.isNotEmpty ? '\n($detail)' : '\n(${error.errorCode.name})'}',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.cream.withValues(alpha: 0.85),
                              height: 1.35,
                              fontSize: 13,
                            ),
                          ),
                          if (onRetry != null) ...[
                            const SizedBox(height: 14),
                            TextButton(
                              onPressed: onRetry,
                              style: TextButton.styleFrom(foregroundColor: AppColors.gold),
                              child: const Text('Try camera again'),
                            ),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            IgnorePointer(
              child: CustomPaint(
                painter: _ViewfinderPainter(
                  color: busy || paused
                      ? AppColors.gold.withValues(alpha: 0.85)
                      : Colors.white.withValues(alpha: 0.9),
                ),
              ),
            ),
            if (paused)
              const ColoredBox(
                color: Color(0x660A1F30),
                child: Center(
                  child: Icon(Icons.check_circle_rounded, color: AppColors.gold, size: 56),
                ),
              ),
            Positioned(
              left: 12,
              right: 12,
              bottom: 12,
              child: Text(
                paused ? 'Invite found' : 'Align the QR inside the frame',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.95),
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  shadows: const [Shadow(blurRadius: 8, color: Colors.black54)],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ViewfinderPainter extends CustomPainter {
  _ViewfinderPainter({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final inset = size.shortestSide * 0.14;
    final rect = Rect.fromLTWH(inset, inset, size.width - inset * 2, size.height - inset * 2);
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    const corner = 28.0;
    canvas.drawPath(
      Path()
        ..moveTo(rect.left, rect.top + corner)
        ..lineTo(rect.left, rect.top)
        ..lineTo(rect.left + corner, rect.top),
      paint,
    );
    canvas.drawPath(
      Path()
        ..moveTo(rect.right - corner, rect.top)
        ..lineTo(rect.right, rect.top)
        ..lineTo(rect.right, rect.top + corner),
      paint,
    );
    canvas.drawPath(
      Path()
        ..moveTo(rect.left, rect.bottom - corner)
        ..lineTo(rect.left, rect.bottom)
        ..lineTo(rect.left + corner, rect.bottom),
      paint,
    );
    canvas.drawPath(
      Path()
        ..moveTo(rect.right - corner, rect.bottom)
        ..lineTo(rect.right, rect.bottom)
        ..lineTo(rect.right, rect.bottom - corner),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _ViewfinderPainter oldDelegate) => oldDelegate.color != color;
}
