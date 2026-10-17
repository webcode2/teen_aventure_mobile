/// Classroom-safe given name only — never show a last name to teachers.
String classroomFirstName(String? fullName) {
  final trimmed = (fullName ?? '').trim();
  if (trimmed.isEmpty) return 'Explorer';
  return trimmed.split(RegExp(r'\s+')).first;
}
