import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Plays a one-shot flower celebration around and over [child].
class CelebrationFlowers extends StatefulWidget {
  const CelebrationFlowers({super.key, required this.child});

  final Widget child;

  @override
  State<CelebrationFlowers> createState() => _CelebrationFlowersState();
}

class _CelebrationFlowersState extends State<CelebrationFlowers>
    with SingleTickerProviderStateMixin {
  late final AnimationController _burst;
  late final List<_Flower> _flowers;

  static const _glyphs = ['🌸', '🌺', '🌼', '🌻', '💮', '🏵️'];
  static const _burstDuration = Duration(milliseconds: 1600);
  static const _fallDuration = Duration(milliseconds: 1200);

  @override
  void initState() {
    super.initState();
    final rng = math.Random();
    _flowers = List.generate(18, (i) {
      final angle = (i / 18) * math.pi * 2 + rng.nextDouble() * 0.35;
      return _Flower(
        glyph: _glyphs[i % _glyphs.length],
        angle: angle,
        distance: 70 + rng.nextDouble() * 110,
        size: 18 + rng.nextDouble() * 16,
        spin: (rng.nextDouble() - 0.5) * 2.4,
        delay: rng.nextDouble() * 0.25,
      );
    });
    _burst = AnimationController(
      vsync: this,
      duration: _burstDuration + _fallDuration,
    )..forward();
  }

  @override
  void dispose() {
    _burst.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      clipBehavior: Clip.none,
      children: [
        _flowerLayer(behind: true),
        widget.child,
        _flowerLayer(behind: false),
      ],
    );
  }

  Widget _flowerLayer({required bool behind}) {
    // The front layer lets taps through to the card's button.
    return IgnorePointer(
      child: AnimatedBuilder(
        animation: _burst,
        builder: (context, _) {
          final burstEnd = _burstDuration.inMilliseconds /
              (_burstDuration + _fallDuration).inMilliseconds;
          final burst = (_burst.value / burstEnd).clamp(0.0, 1.0);
          final fall = _burst.value > burstEnd
              ? (_burst.value - burstEnd) / (1 - burstEnd)
              : 0.0;
          if (fall >= 1.0) return const SizedBox.shrink();

          return Stack(
            alignment: Alignment.center,
            clipBehavior: Clip.none,
            children: [
              for (var i = 0; i < _flowers.length; i++)
                if (i.isEven == behind)
                  _FlowerBurst(flower: _flowers[i], t: burst, fall: fall),
            ],
          );
        },
      ),
    );
  }
}

class _Flower {
  const _Flower({
    required this.glyph,
    required this.angle,
    required this.distance,
    required this.size,
    required this.spin,
    required this.delay,
  });

  final String glyph;
  final double angle;
  final double distance;
  final double size;
  final double spin;
  final double delay;
}

class _FlowerBurst extends StatelessWidget {
  const _FlowerBurst({
    required this.flower,
    required this.t,
    required this.fall,
  });

  final _Flower flower;
  final double t;
  final double fall;

  @override
  Widget build(BuildContext context) {
    final local = ((t - flower.delay) / (1 - flower.delay)).clamp(0.0, 1.0);
    final eased = Curves.easeOutCubic.transform(local);
    final dx = math.cos(flower.angle) * flower.distance * eased;
    final dy = math.sin(flower.angle) * flower.distance * eased -
        40 * math.sin(eased * math.pi) +
        120 * Curves.easeInQuad.transform(fall);
    final opacity = (1.0 - eased * 0.35) * (1.0 - fall);
    return Transform.translate(
      offset: Offset(dx, dy),
      child: Transform.rotate(
        angle: flower.spin * eased * math.pi,
        child: Opacity(
          opacity: opacity,
          child: Text(
            flower.glyph,
            style: TextStyle(fontSize: flower.size),
          ),
        ),
      ),
    );
  }
}
