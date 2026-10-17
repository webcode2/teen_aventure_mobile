import 'package:flutter_test/flutter_test.dart';
import 'package:teen_aventure/utils/classroom_name.dart';

void main() {
  group('classroomFirstName', () {
    test('returns only the first name', () {
      expect(classroomFirstName('Hannah Brooks'), 'Hannah');
      expect(classroomFirstName('  Maya Lin  '), 'Maya');
      expect(classroomFirstName('Sam'), 'Sam');
    });

    test('falls back when empty', () {
      expect(classroomFirstName(''), 'Explorer');
      expect(classroomFirstName(null), 'Explorer');
      expect(classroomFirstName('   '), 'Explorer');
    });
  });
}
