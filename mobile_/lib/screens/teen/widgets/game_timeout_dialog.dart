import 'package:flutter/material.dart';

import '../../../models/game_time_limit.dart';
import '../../../services/content_service.dart';

Future<bool?> showGameTimeoutDialog(
  BuildContext context, {
  required String gameTitle,
  required GameRoundScore score,
  required String itemLabel,
  String endReason = 'time ran out',
  ActivityAward? award,
}) {
  final recorded = award?.gamePassed == true;
  final items = score.total == 1 ? itemLabel : '${itemLabel}s';
  final message = recorded
      ? 'You passed. Nice work!'
      : score.passed
          ? 'You passed, but we couldn’t save the result. Give it another try.'
          : score.allAttempted
              ? 'Good effort. Aim for more than half correct on your next try.'
              : 'Good effort. Try every $itemLabel in the next round to qualify for a recorded score.';
  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (dialogContext) => PopScope(
      canPop: false,
      child: AlertDialog(
        title: Text(recorded ? 'Well done!' : 'Keep going!'),
        scrollable: true,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(gameTitle, style: Theme.of(dialogContext).textTheme.titleSmall),
            const SizedBox(height: 8),
            Text('You got ${score.correct} of ${score.total} $items right (${score.percent}%) before $endReason.'),
            const SizedBox(height: 8),
            if (score.points != null)
              Text('Score: ${score.points} / ${score.maxPoints} points'),
            if (recorded && award!.points != score.points)
              Text('${award.points} new quest points awarded.'),
            const SizedBox(height: 8),
            Text(message),
          ],
        ),
        actions: [
          if (!recorded)
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel'),
            ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, !recorded),
            child: Text(recorded ? 'Continue' : 'Try again'),
          ),
        ],
      ),
    ),
  );
}
