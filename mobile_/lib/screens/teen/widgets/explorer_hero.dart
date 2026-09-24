import 'package:flutter/material.dart';
import '../../../theme.dart';
import '../../shared/widgets/mascot_scene.dart';

class ExplorerHero extends StatelessWidget {
  const ExplorerHero({super.key});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: const CustomPaint(
        painter: _ExplorerWashPainter(),
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 14, 2, 0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(top: 6, bottom: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.explore, color: AppColors.gold, size: 22),
                      SizedBox(height: 6),
                      Text(
                        'Hey, Explorer!',
                        style: TextStyle(
                          color: AppColors.navy,
                          fontSize: 28,
                          fontWeight: FontWeight.w600,
                          height: 1.05,
                          letterSpacing: -0.8,
                        ),
                      ),
                      SizedBox(height: 6),
                      Text(
                        "Ready for today's adventure in God's Word?",
                        style: TextStyle(
                          color: AppColors.navy,
                          fontSize: 15,
                          fontWeight: FontWeight.w400,
                          height: 1.3,
                          letterSpacing: -0.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Expanded(child: MascotScene(height: 168)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ExplorerWashPainter extends CustomPainter {
  const _ExplorerWashPainter();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(Offset.zero & size, Paint()..color = const Color(0xFFFFF8EE));

    void blob(Offset center, double radius, Color color) {
      canvas.drawCircle(center, radius, Paint()..color = color);
    }

    blob(Offset(size.width * 0.92, size.height * 0.15), size.width * 0.42, const Color(0x55E6F6F6));
    blob(Offset(size.width * 0.72, size.height * 1.05), size.width * 0.38, const Color(0x66F8E7DF));
    blob(Offset(size.width * 0.08, size.height * 0.95), size.width * 0.28, const Color(0x55F6E7C8));
    blob(Offset(size.width * 0.55, size.height * 0.2), 28, const Color(0x33F4B942));
    blob(Offset(size.width * 0.18, size.height * 0.22), 10, const Color(0x44159A9C));

    final arc = Paint()
      ..color = const Color(0x22159A9C)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 10;
    canvas.drawArc(
      Rect.fromCircle(center: Offset(size.width * 0.84, size.height * 0.55), radius: 54),
      0.4,
      4.2,
      false,
      arc,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
