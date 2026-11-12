import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/models/quiz_rating.dart';

void main() {
  test('any quiz length is shown out of 10', () {
    expect(QuizRating(15, 30).label, '5/10');
    expect(QuizRating(3, 4).label, '7.5/10');
    expect(QuizRating(30, 30).label, '10/10');
    expect(QuizRating(0, 30).label, '0/10');
    expect(QuizRating(2, 3).label, '6.7/10');
  });

  test('bands follow the exact percentage', () {
    expect(QuizRating(14, 30).band, QuizBand.keepGoing); // 46.7%
    expect(QuizRating(15, 30).band, QuizBand.average); // exactly 50%
    expect(QuizRating(20, 30).band, QuizBand.average); // 66.7%
    expect(QuizRating(21, 30).band, QuizBand.good); // exactly 70%
    expect(QuizRating(26, 30).band, QuizBand.good); // 86.7%
    expect(QuizRating(27, 30).band, QuizBand.excellent); // exactly 90%
    expect(QuizRating(29, 30).band, QuizBand.excellent); // 96.7%, not perfect
    expect(QuizRating(30, 30).band, QuizBand.perfect);
  });

  test('each band has its own message', () {
    final messages = {
      for (final rating in [QuizRating(1, 10), QuizRating(5, 10), QuizRating(7, 10), QuizRating(9, 10), QuizRating(10, 10)])
        rating.message,
    };
    expect(messages, hasLength(5));
    expect(QuizRating(10, 10).message, contains('Keep it up'));
  });

  test('a quiz with no questions does not divide by zero', () {
    expect(QuizRating(0, 0).label, '0/10');
    expect(QuizRating(0, 0).band, QuizBand.keepGoing);
  });
}
