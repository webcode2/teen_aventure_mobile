import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../adventure_assets.dart';
import '../../theme.dart';
import '../shared/widgets/adventure_logo.dart';
import 'auth_gate.dart';

/// Branded launch screen with a short logo entrance animation.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, this.next});

  /// Test override to skip [AuthGate] and avoid mounting the full app graph.
  final Widget? next;

  @visibleForTesting
  static const minDisplayDuration = Duration(milliseconds: 2200);

  @visibleForTesting
  static const logoAnimationDuration = Duration(milliseconds: 1200);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: SplashScreen.logoAnimationDuration,
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _scale = Tween<double>(begin: 0.78, end: 1).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );
    _launch();
  }

  Future<void> _launch() async {
    await loadAdventureSvg(AdventureAssets.logo);
    if (!mounted) return;
    unawaited(_controller.forward());
    await Future<void>.delayed(SplashScreen.minDisplayDuration);
    if (!mounted) return;

    final destination = widget.next ?? const AuthGate();
    await Navigator.of(context).pushReplacement(
      PageRouteBuilder<void>(
        pageBuilder: (_, __, ___) => destination,
        transitionDuration: const Duration(milliseconds: 450),
        transitionsBuilder: (_, animation, __, child) {
          return FadeTransition(opacity: animation, child: child);
        },
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const overlay = SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: AppColors.splash,
      systemNavigationBarIconBrightness: Brightness.light,
    );
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlay,
      child: Scaffold(
        backgroundColor: AppColors.splash,
        body: ColoredBox(
          color: AppColors.splash,
          child: SizedBox.expand(
            child: Center(
              child: FadeTransition(
                opacity: _fade,
                child: ScaleTransition(
                  scale: _scale,
                  child: const AdventureLogo(height: 120),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
