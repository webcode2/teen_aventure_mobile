import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import 'birth_year_gate_screen.dart';
import 'force_password_change_screen.dart';
import 'family_profile_picker_screen.dart';
import '../home/home_screen.dart';
import 'login_screen.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key, this.authenticatedChild});

  /// Test override so widget tests do not mount the full home graph.
  final Widget? authenticatedChild;

  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    if (!session.ready) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!session.authenticated) {
      return LoginScreen(onAuthenticated: () {});
    }
    if (session.mustChangePassword) {
      return const ForcePasswordChangeScreen();
    }
    if (session.needsBirthYear) {
      return const BirthYearGateScreen();
    }
    if (session.needsProfilePick) {
      return const FamilyProfilePickerScreen();
    }
    return authenticatedChild ??
        const HomeScreen(key: Key('authenticated-shell'));
  }
}
