import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import 'birth_year_gate_screen.dart';
import 'force_password_change_screen.dart';
import 'family_profile_picker_screen.dart';
import '../home/home_screen.dart';
import '../groups/join_invite_screen.dart';
import 'login_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, this.authenticatedChild});

  /// Test override so widget tests do not mount the full home graph.
  final Widget? authenticatedChild;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  static const _joinLinks = MethodChannel('tba/join_links');
  static final _joinPath = RegExp(r'^/(church|class)/[a-zA-Z0-9]{4,12}/?$');
  bool _joinPending = false;
  bool _joinOpen = false;

  bool get _listensForLinks =>
      !kIsWeb && defaultTargetPlatform == TargetPlatform.android;

  @override
  void initState() {
    super.initState();
    if (!_listensForLinks) return;
    _joinLinks.setMethodCallHandler((call) async {
      if (call.method == 'joinLinkAvailable') await _takeJoinLink();
    });
    _takeJoinLink();
  }

  Future<void> _takeJoinLink() async {
    final String? link;
    try {
      link = await _joinLinks.invokeMethod<String>('takePendingJoinLink');
    } on MissingPluginException {
      return;
    }
    if (link == null || !mounted || _joinOpen) return;
    final uri = Uri.tryParse(link);
    if (uri == null) return;
    final path = switch ((uri.scheme, uri.host)) {
      ('https', 'tba.elastrocloud.com') when uri.path.startsWith('/join/') =>
        uri.path.substring('/join'.length),
      ('tba', 'join') => uri.path,
      _ => '',
    };
    if (_joinPath.hasMatch(path)) setState(() => _joinPending = true);
  }

  bool _canOpenJoin(AuthSession session) =>
      session.ready &&
      session.authenticated &&
      !session.mustChangePassword &&
      !session.needsBirthYear &&
      !session.needsProfilePick;

  Future<void> _openPendingJoin() async {
    if (!mounted || !_joinPending || _joinOpen ||
        !_canOpenJoin(context.read<AuthSession>())) {
      return;
    }
    _joinPending = false;
    _joinOpen = true;
    try {
      await Navigator.of(context).push(MaterialPageRoute<bool>(
        builder: (_) => const JoinInviteScreen(rescanFromPhoneCamera: true),
      ));
    } finally {
      _joinOpen = false;
    }
  }

  @override
  void dispose() {
    if (_listensForLinks) _joinLinks.setMethodCallHandler(null);
    super.dispose();
  }

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
    if (_joinPending) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _openPendingJoin());
    }
    return widget.authenticatedChild ??
        HomeScreen(key: ValueKey((session.userId, session.childId)));
  }
}
