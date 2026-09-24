class WordInput {
  final String answer;
  final String clue;
  final String ref;
  final String verseText;

  const WordInput(this.answer, this.clue, this.ref, {this.verseText = ''});

  factory WordInput.fromMap(Map<String, dynamic> m) => WordInput(
        m['answer'] as String,
        m['clue'] as String,
        (m['ref'] as String?) ?? '',
        verseText: (m['verseText'] as String?) ?? '',
      );

  Map<String, dynamic> toMap() => {
        'answer': answer,
        'clue': clue,
        'ref': ref,
        'verseText': verseText,
      };
}

class Episode {
  final String id;
  final int episodeNumber;
  final String title;
  final String subtitle;
  final List<WordInput> words;

  const Episode({
    required this.id,
    required this.episodeNumber,
    required this.title,
    required this.subtitle,
    required this.words,
  });

  factory Episode.fromDoc(String id, Map<String, dynamic> m) => Episode(
        id: id,
        episodeNumber: (m['episodeNumber'] as int?) ?? 1,
        title: m['title'] as String,
        subtitle: (m['subtitle'] as String?) ?? '',
        words: [
          for (final w in (m['words'] as List))
            WordInput(
              w['answer'] as String,
              w['clue'] as String,
              (w['ref'] as String?) ?? '',
              verseText: (w['verseText'] as String?) ?? '',
            )
        ],
      );

  Map<String, dynamic> toDoc() => {
        'episodeNumber': episodeNumber,
        'title': title,
        'subtitle': subtitle,
        'words': words.map((w) => w.toMap()).toList(),
      };
}
