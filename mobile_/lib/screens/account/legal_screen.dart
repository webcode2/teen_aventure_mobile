import 'package:flutter/material.dart';
import '../../theme.dart';

enum LegalDoc { privacy, terms }

class LegalScreen extends StatelessWidget {
  const LegalScreen({super.key, required this.doc});

  final LegalDoc doc;

  @override
  Widget build(BuildContext context) {
    final isPrivacy = doc == LegalDoc.privacy;
    return Scaffold(
      backgroundColor: AppColors.cream,
      appBar: AppBar(
        backgroundColor: AppColors.navy,
        foregroundColor: AppColors.cream,
        title: Text(isPrivacy ? 'Privacy Policy' : 'Terms of Use'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Text(
          isPrivacy ? _privacyBody : _termsBody,
          style: const TextStyle(
            color: AppColors.navy,
            height: 1.45,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}

const _privacyBody = '''
Teen Bible Adventures Privacy Policy
Last updated: 29 August 2026

This app is for teens aged 13 and older. It is not directed at children under 13.

What we store on the device
Progress, scores, and settings are saved on your device (for example SharedPreferences). Version 1 does not create an online account in the store build.

What we do not do
We do not show ads. We do not sell personal information. We do not download YouTube videos.

YouTube
Lesson videos may play through YouTube’s player. Google’s terms and privacy policy apply to that playback. We only stream videos you or the publisher publish.

Network
If a production server is configured, the app may load lesson lists over HTTPS. Do not send the app secrets, passwords, or unnecessary personal data in lesson titles.

Contact
Ask the app publisher listed on Google Play for privacy questions.

Host this same text at a public HTTPS URL and paste that URL into Play Console → App content → Privacy policy.
''';

const _termsBody = '''
Teen Bible Adventures Terms of Use
Last updated: 29 August 2026

You must be at least 13 years old to use this app.

The app provides Bible lessons, quizzes, and related activities. Content is for education and discipleship. It is not a substitute for pastoral care.

YouTube videos remain on YouTube. You may not use this app to download or rip YouTube content.

Quiz scores in version 1 may be stored only on the device unless a family backend is configured by the publisher.

The publisher may update these terms. Continued use after an update means you accept the new terms.

Google Play’s terms also apply to installation and billing (this app is free).
''';
