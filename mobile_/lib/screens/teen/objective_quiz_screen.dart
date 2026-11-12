import '../../providers/cms_text.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../models/game_controller.dart';
import '../../models/puzzle.dart';
import '../../theme.dart';
import 'week_quest_flow.dart';
import '../../services/error_text.dart';

class ObjectiveQuizScreen extends StatefulWidget {
  const ObjectiveQuizScreen({
    super.key,
    this.embedded = false,
    this.questionsOverride,
    this.onSubmitLive,
    this.levelId,
    this.alreadyCompleted = false,
  });

  final bool embedded;
  /// Week quiz from the API. Empty list shows an unavailable state (no bundled sample quiz).
  final List<QuizQuestion>? questionsOverride;
  /// Multiple-choice answers are ints; fill-in-the-blank answers are strings.
  final Future<void> Function(List<Object> answers)? onSubmitLive;
  final int? levelId;
  /// True when this week's quiz was already finished — practice only, no points.
  final bool alreadyCompleted;

  @override
  State<ObjectiveQuizScreen> createState() => _ObjectiveQuizScreenState();
}

class _ObjectiveQuizScreenState extends State<ObjectiveQuizScreen> {
  late List<QuizQuestion> questions;
  int currentIndex = 0;
  int? selectedOption;
  String fillBlankText = '';
  int score = 0;
  int correctAnswers = 0;
  bool isSubmitted = false;
  /// Guards the final submit against double taps.
  bool _finishing = false;
  final List<Object?> _answers = [];
  late final TextEditingController _fillBlankController;

  @override
  void initState() {
    super.initState();
    questions = widget.questionsOverride ?? const [];
    _answers.addAll(List<Object?>.filled(questions.length, null));
    _fillBlankController = TextEditingController();
  }

  @override
  void dispose() {
    _fillBlankController.dispose();
    super.dispose();
  }

  QuizQuestion get current => questions[currentIndex];
  bool get isFillBlank => current.isFillBlank;
  bool get isCorrect {
    if (isFillBlank) return current.matchesFillBlank(fillBlankText);
    return selectedOption == current.answerIndex;
  }

  bool get canCheck {
    if (isFillBlank) return fillBlankText.trim().isNotEmpty;
    return selectedOption != null;
  }

  bool get isLast => currentIndex >= questions.length - 1;
  double get quizProgress =>
      ((currentIndex + (isSubmitted ? 1 : 0)) / questions.length).clamp(0.0, 1.0);

  void _selectOption(int i) {
    if (isSubmitted || isFillBlank) return;
    setState(() => selectedOption = i);
  }

  void _restoreAnswerForIndex(int index) {
    final saved = _answers[index];
    if (questions[index].isFillBlank) {
      fillBlankText = saved is String ? saved : '';
      _fillBlankController.text = fillBlankText;
      selectedOption = null;
    } else {
      selectedOption = saved is int ? saved : null;
      fillBlankText = '';
      _fillBlankController.clear();
    }
    isSubmitted = saved != null;
  }

  void _checkAnswer() {
    if (!canCheck || isSubmitted) return;
    _answers[currentIndex] = isFillBlank ? fillBlankText.trim() : selectedOption;
    if (isCorrect) {
      correctAnswers++;
      if (!widget.alreadyCompleted) score += current.points;
    }
    setState(() => isSubmitted = true);
  }

  void _previous() {
    if (currentIndex <= 0) return;
    setState(() {
      currentIndex--;
      _restoreAnswerForIndex(currentIndex);
    });
  }

  void _next() {
    if (!isSubmitted) {
      _checkAnswer();
      return;
    }
    if (!isLast) {
      setState(() {
        currentIndex++;
        _restoreAnswerForIndex(currentIndex);
      });
      return;
    }
    _showQuizResults();
  }

  Future<void> _showQuizResults() async {
    if (_finishing) return;
    _finishing = true;
    final answers = <Object>[
      for (var i = 0; i < _answers.length; i++)
        _answers[i] ?? (questions[i].isFillBlank ? '' : 0),
    ];
    if (widget.onSubmitLive != null) {
      try {
        await widget.onSubmitLive!(answers);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorText(e, fallback: 'Could not save your quiz. Check your connection.')),
              backgroundColor: AppColors.navy,
            ),
          );
        }
      }
    }
    if (!mounted) return;
    if (!widget.alreadyCompleted) {
      try {
        context.read<GameController>().completeWeekQuiz();
      } catch (_) {}
    }
    final practice = widget.alreadyCompleted;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        contentPadding: const EdgeInsets.fromLTRB(24, 28, 24, 8),
        titlePadding: EdgeInsets.zero,
        title: null,
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(
                color: AppColors.gold.withValues(alpha: 0.16),
                shape: BoxShape.circle,
              ),
              child: Icon(
                practice ? Icons.check_circle_rounded : Icons.emoji_events_rounded,
                color: AppColors.gold,
                size: 52,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              practice ? 'Practice complete' : cmsText(context, 'messages', 'quizSuccess', 'Quiz finished!'),
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 20,
                color: AppColors.navy,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              '$correctAnswers / ${questions.length} correct',
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.navy),
            ),
            const SizedBox(height: 8),
            Text(
              practice
                  ? 'Nice review. No new points this time.'
                  : 'Great work. You earned +$score points.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 15,
                color: AppColors.textMuted,
                height: 1.4,
              ),
            ),
          ],
        ),
        actionsAlignment: MainAxisAlignment.center,
        actionsPadding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
        actions: [
          FilledButton(
            onPressed: () {
              final nav = Navigator.of(context);
              nav.pop(); // close results dialog
              if (widget.embedded) {
                setState(() {
                  currentIndex = 0;
                  selectedOption = null;
                  fillBlankText = '';
                  _fillBlankController.clear();
                  isSubmitted = false;
                  score = 0;
                  correctAnswers = 0;
                  for (var i = 0; i < _answers.length; i++) {
                    _answers[i] = null;
                  }
                });
                return;
              }
              if (widget.levelId != null) {
                nav.pop();
                return;
              }
              WeekQuestFlow.openNext(context, replace: true);
            },
            style: FilledButton.styleFrom(
              backgroundColor: AppColors.navy,
              foregroundColor: AppColors.cream,
              padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            ),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (questions.isEmpty) {
      final empty = Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Quiz questions are not available for this week yet.',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: AppColors.navy.withValues(alpha: 0.75),
              fontSize: 15,
              height: 1.4,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
      if (widget.embedded) return empty;
      return Scaffold(
        backgroundColor: AppColors.cream,
        appBar: AppBar(
          backgroundColor: AppColors.cream,
          foregroundColor: AppColors.navy,
          elevation: 0,
        ),
        body: empty,
      );
    }

    final verse = current.verseReference?.trim();
    final body = Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.levelId == null
                    ? "This Week's Quest"
                    : 'Level ${widget.levelId}',
                style: const TextStyle(
                  color: AppColors.navy,
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  letterSpacing: -0.4,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                verse == null || verse.isEmpty
                    ? '3 videos · 1 quiz · 1 game'
                    : verse,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 20),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: quizProgress,
                  minHeight: 4,
                  backgroundColor: AppColors.border,
                  color: AppColors.orange,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        Expanded(
          child: Container(
            width: double.infinity,
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              border: Border(
                top: BorderSide(color: AppColors.border),
              ),
            ),
            child: Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
                    children: [
                      Text(
                        'Q.${currentIndex + 1}/${questions.length}',
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        current.question,
                        style: const TextStyle(
                          color: AppColors.navy,
                          fontWeight: FontWeight.w700,
                          fontSize: 18,
                          height: 1.45,
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 28),
                      if (isFillBlank) ...[
                        TextField(
                          controller: _fillBlankController,
                          enabled: !isSubmitted,
                          textCapitalization: TextCapitalization.sentences,
                          decoration: InputDecoration(
                            hintText: 'Type your answer',
                            filled: true,
                            fillColor: AppColors.cream,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: AppColors.border),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: const BorderSide(color: AppColors.teal, width: 1.5),
                            ),
                          ),
                          onChanged: (value) => setState(() => fillBlankText = value),
                          onSubmitted: (_) {
                            if (!isSubmitted && canCheck) _checkAnswer();
                          },
                        ),
                      ] else ...[
                        for (var i = 0; i < current.options.length; i++) ...[
                          if (i > 0) const SizedBox(height: 12),
                          _AnswerTile(
                            letter: String.fromCharCode(65 + i),
                            text: current.options[i],
                            state: _answerState(i),
                            onTap: () => _selectOption(i),
                          ),
                        ],
                      ],
                      if (isSubmitted) ...[
                        const SizedBox(height: 24),
                        _AnswerFeedback(question: current, correct: isCorrect),
                      ],
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
                _QuizFooter(
                  canGoPrevious: currentIndex > 0,
                  primaryLabel: !isSubmitted
                      ? (canCheck ? 'Check' : (isFillBlank ? 'Type an answer' : 'Select an answer'))
                      : (isLast ? 'See results' : 'Next'),
                  primaryEnabled: isSubmitted || canCheck,
                  onPrevious: _previous,
                  onPrimary: _next,
                ),
              ],
            ),
          ),
        ),
      ],
    );

    final scaffold = Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.cream,
        elevation: 0,
        scrolledUnderElevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        centerTitle: true,
        leading: Padding(
          padding: const EdgeInsets.only(left: 12),
          child: Center(
            child: Material(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: () => Navigator.maybePop(context),
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Icon(Icons.chevron_left_rounded, color: AppColors.navy, size: 26),
                ),
              ),
            ),
          ),
        ),
        title: const Text(
          'Quiz',
          style: TextStyle(
            color: AppColors.navy,
            fontWeight: FontWeight.w700,
            fontSize: 17,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          if (isSubmitted && isLast)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: OutlinedButton(
                onPressed: _showQuizResults,
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.navy,
                  side: const BorderSide(color: AppColors.navy, width: 1.4),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Submit', style: TextStyle(fontWeight: FontWeight.w600)),
              ),
            ),
        ],
      ),
      body: body,
    );

    if (widget.embedded) {
      return ColoredBox(color: AppColors.cream, child: body);
    }
    return scaffold;
  }

  _AnswerState _answerState(int i) {
    if (!isSubmitted) {
      return selectedOption == i ? _AnswerState.selected : _AnswerState.idle;
    }
    if (i == current.answerIndex) return _AnswerState.correct;
    if (i == selectedOption) return _AnswerState.wrong;
    return _AnswerState.idle;
  }
}

enum _AnswerState { idle, selected, correct, wrong }

class _AnswerTile extends StatelessWidget {
  const _AnswerTile({
    required this.letter,
    required this.text,
    required this.state,
    required this.onTap,
  });

  final String letter;
  final String text;
  final _AnswerState state;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    late final Color border;
    late final Color bg;
    Widget? trailing;

    switch (state) {
      case _AnswerState.correct:
        border = AppColors.forestGreen;
        bg = AppColors.correctFill;
        trailing = const Icon(Icons.check_circle_rounded, color: AppColors.forestGreen, size: 20);
      case _AnswerState.wrong:
        border = const Color(0xFFBA1A1A);
        bg = const Color(0xFFFFDAD6);
        trailing = const Icon(Icons.cancel_rounded, color: Color(0xFFBA1A1A), size: 20);
      case _AnswerState.selected:
        border = AppColors.orange;
        bg = AppColors.terracottaContainer;
      case _AnswerState.idle:
        border = AppColors.border;
        bg = AppColors.answerFill;
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: border,
              width: state == _AnswerState.selected ||
                      state == _AnswerState.correct ||
                      state == _AnswerState.wrong
                  ? 1.6
                  : 1,
            ),
          ),
          child: Row(
            children: [
              Text(
                '$letter.',
                style: const TextStyle(
                  color: AppColors.navy,
                  fontWeight: FontWeight.w700,
                  fontSize: 15,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text,
                  style: const TextStyle(
                    color: AppColors.navy,
                    fontWeight: FontWeight.w500,
                    fontSize: 15,
                    height: 1.35,
                  ),
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
        ),
      ),
    );
  }
}

class _AnswerFeedback extends StatelessWidget {
  const _AnswerFeedback({required this.question, required this.correct});

  final QuizQuestion question;
  final bool correct;

  @override
  Widget build(BuildContext context) {
    final color = correct ? AppColors.forestGreen : const Color(0xFFBA1A1A);
    final bg = correct ? AppColors.correctFill : const Color(0xFFFFDAD6);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            correct ? 'Correct' : 'Not quite',
            style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 15),
          ),
          if (!correct && question.isFillBlank && question.acceptedAnswers.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              'Accepted: ${question.acceptedAnswers.first}',
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
            ),
          ],
          if (question.explanation != null) ...[
            const SizedBox(height: 6),
            Text(
              question.explanation!,
              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
            ),
          ],
          if (question.verseReference != null) ...[
            const SizedBox(height: 8),
            Text(
              question.verseReference!,
              style: const TextStyle(
                color: AppColors.teal,
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _QuizFooter extends StatelessWidget {
  const _QuizFooter({
    required this.canGoPrevious,
    required this.primaryLabel,
    required this.primaryEnabled,
    required this.onPrevious,
    required this.onPrimary,
  });

  final bool canGoPrevious;
  final String primaryLabel;
  final bool primaryEnabled;
  final VoidCallback onPrevious;
  final VoidCallback onPrimary;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: AppColors.border)),
        ),
        child: Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 52,
                child: OutlinedButton(
                  onPressed: canGoPrevious ? onPrevious : null,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.navy,
                    disabledForegroundColor: AppColors.textMuted.withValues(alpha: 0.45),
                    side: BorderSide(
                      color: canGoPrevious
                          ? AppColors.borderDark
                          : AppColors.border.withValues(alpha: 0.6),
                    ),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Previous', style: TextStyle(fontWeight: FontWeight.w600)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: SizedBox(
                height: 52,
                child: FilledButton(
                  onPressed: primaryEnabled ? onPrimary : null,
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.navy,
                    disabledBackgroundColor: AppColors.navy.withValues(alpha: 0.28),
                    foregroundColor: AppColors.cream,
                    disabledForegroundColor: AppColors.cream.withValues(alpha: 0.7),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text(primaryLabel, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
