import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme.dart';

typedef InviteQrDetected = void Function(String raw);

class InviteQrScannerController {
  InviteQrScannerController()
      : _inner = MobileScannerController(
          detectionSpeed: DetectionSpeed.normal,
          facing: CameraFacing.back,
          formats: const [BarcodeFormat.qrCode],
        );

  final MobileScannerController _inner;
  bool _torchOn = false;

  Future<void> start() => _inner.start();
  Future<void> stop() => _inner.stop();
  Future<void> dispose() => _inner.dispose();

  Future<void> toggleTorch() async {
    await _inner.toggleTorch();
    _torchOn = !_torchOn;
  }

  bool get torchOn => _torchOn;

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
}) {
  if (controller == null) return const SizedBox.shrink();
  return _QrScannerFrame(
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
  );
}

class _QrScannerFrame extends StatelessWidget {
  const _QrScannerFrame({
    required this.controller,
    required this.onDetect,
    required this.busy,
    required this.paused,
  });

  final MobileScannerController controller;
  final void Function(BarcodeCapture capture) onDetect;
  final bool busy;
  final bool paused;

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
                            'Allow camera access in settings, or paste the invite code below.\n(${error.errorCode.name})',
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
