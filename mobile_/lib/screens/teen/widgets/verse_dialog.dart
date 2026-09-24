import 'package:flutter/material.dart';
import '../../../models/puzzle.dart';
import '../../../theme.dart';

class VerseDialog extends StatelessWidget {
  final PWord word;
  const VerseDialog({super.key, required this.word});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: AppRadii.cardRadius),
      backgroundColor: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('🎉', style: TextStyle(fontSize: 44)),
            const SizedBox(height: 6),
            Text(
              word.answer,
              style: const TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: TeenAppTheme.deepPurple,
                letterSpacing: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              word.clue,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: TeenAppTheme.lavender,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: TeenAppTheme.violet.withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.menu_book, color: TeenAppTheme.deepPurple, size: 18),
                      const SizedBox(width: 6),
                      Text(
                        word.ref,
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: TeenAppTheme.deepPurple,
                        ),
                      ),
                    ],
                  ),
                  if (word.verseText.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      '"${word.verseText}"',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12,
                        fontStyle: FontStyle.italic,
                        color: TeenAppTheme.midnight,
                        height: 1.3,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                style: FilledButton.styleFrom(
                  backgroundColor: TeenAppTheme.violet,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text(
                  'Amen! (+1 💎 & 50 pts)',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
