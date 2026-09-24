import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../theme.dart';

/// On Android root screens: first back shows a snackbar, second exits the app.
class DoubleBackExit extends StatefulWidget {
  const DoubleBackExit({
    super.key,
    required this.child,
    this.onUnhandledBack,
    this.warningMessage = 'Press back again to exit',
    this.window = const Duration(seconds: 2),
  });

  final Widget child;

  /// Called when the navigator cannot pop. Return `true` if you handled it
  /// (e.g. closed a drawer or switched tabs). Return `false` to use exit warning.
  final Future<bool> Function()? onUnhandledBack;

  final String warningMessage;
  final Duration window;

  @override
  State<DoubleBackExit> createState() => _DoubleBackExitState();
}

class _DoubleBackExitState extends State<DoubleBackExit> {
  DateTime? _lastBackAt;

  Future<void> _onPopInvoked(bool didPop) async {
    if (didPop) return;

    final navigator = Navigator.of(context);
    if (navigator.canPop()) {
      navigator.pop();
      return;
    }

    if (widget.onUnhandledBack != null) {
      final handled = await widget.onUnhandledBack!();
      if (handled) {
        _lastBackAt = null;
        return;
      }
    }

    final now = DateTime.now();
    final last = _lastBackAt;
    if (last != null && now.difference(last) <= widget.window) {
      await SystemNavigator.pop();
      return;
    }

    _lastBackAt = now;
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(widget.warningMessage),
          duration: widget.window,
          backgroundColor: AppColors.navy,
          behavior: SnackBarBehavior.floating,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) => _onPopInvoked(didPop),
      child: widget.child,
    );
  }
}
