import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/game_controller.dart';

/// "1,250 pts" — the one way points are written across the app.
String pointsLabel(int points, {bool signed = false}) {
  final digits = points.abs().toString();
  final grouped = digits.replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',');
  final sign = points < 0 ? '-' : (signed ? '+' : '');
  return '$sign$grouped pts';
}

/// The signed-in explorer's points total, kept in step with the server after
/// every award (see [GameController.refreshScore]).
class PointsTotal extends StatelessWidget {
  const PointsTotal({super.key, this.style});

  final TextStyle? style;

  @override
  Widget build(BuildContext context) {
    final points = context.select<GameController, int>((game) => game.score);
    return Text(pointsLabel(points), style: style);
  }
}
