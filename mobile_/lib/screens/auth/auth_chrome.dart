import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../theme.dart';
import '../shared/widgets/adventure_logo.dart';
import '../shared/widgets/mascot_scene.dart';

class AuthChrome extends StatelessWidget {
  const AuthChrome({
    super.key,
    required this.title,
    required this.child,
    this.subtitle,
    this.showBack = false,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    final canPop = showBack && Navigator.of(context).canPop();
    return Scaffold(
      backgroundColor: AppColors.navy,
      body: LayoutBuilder(
        builder: (context, constraints) {
          // Flutter web can layout the first frame at 1×1; skip that pass.
          if (constraints.maxWidth < 8 || constraints.maxHeight < 8) {
            return const ColoredBox(color: AppColors.navy);
          }
          return Column(
            children: [
              SafeArea(
                bottom: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(8, 4, 16, 4),
                  child: Row(
                    children: [
                      if (canPop)
                        IconButton(
                          tooltip: 'Back',
                          onPressed: () => Navigator.of(context).pop(),
                          icon: const Icon(Icons.arrow_back, color: Colors.white),
                        )
                      else
                        const SizedBox(width: 48),
                      const Expanded(child: AdventureLogo(height: 72)),
                      const SizedBox(width: 48),
                    ],
                  ),
                ),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius:
                      const BorderRadius.vertical(top: Radius.circular(28)),
                  child: ColoredBox(
                    color: AppColors.cream,
                    child: Stack(
                      children: [
                        Center(
                          child: ConstrainedBox(
                            constraints: const BoxConstraints(maxWidth: 440),
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const MascotScene(height: 132),
                                  const SizedBox(height: 8),
                                  Text(
                                    title,
                                    textAlign: TextAlign.center,
                                    style: const TextStyle(
                                      color: AppColors.navy,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 20,
                                    ),
                                  ),
                                  if (subtitle != null) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      subtitle!,
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(
                                        color: AppColors.textMuted,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 18),
                                  child,
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

String? validateEmail(String value) {
  if (value.trim().isEmpty) return 'Email is required';
  if (!value.contains('@')) return 'Enter a valid email';
  return null;
}

String? validatePassword(String value) {
  if (value.isEmpty) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  return null;
}

String? validatePin(String value) {
  if (value.length != 4) return 'PIN must be 4 digits';
  if (int.tryParse(value) == null) return 'PIN must be 4 digits';
  return null;
}

/// After tokens are stored, refresh session and dismiss any auth sub-routes
/// (e.g. Create account / Teen sign in) so [AuthGate] can show Home.
Future<void> completeAuthFlow(
  BuildContext context, {
  VoidCallback? onAuthenticated,
}) async {
  await context.read<AuthSession>().afterLogin();
  if (!context.mounted) return;
  final nav = Navigator.of(context);
  if (nav.canPop()) {
    nav.popUntil((route) => route.isFirst);
  }
  onAuthenticated?.call();
}

