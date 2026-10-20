import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/auth_session.dart';
import '../../platform/resource_webview.dart';
import '../../theme.dart';

/// Credentials are entered on the HTTPS deletion page, never passed in a URL.
class IndividualAccountDeletionScreen extends StatelessWidget {
  const IndividualAccountDeletionScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final session = context.watch<AuthSession>();
    const website = String.fromEnvironment('WEB_BASE_URL', defaultValue: 'https://teen.elastrocloud.com');
    final url = Uri.parse(website).resolve('/delete-account');
    final allowed = url.scheme == 'https' || (url.scheme == 'http' && ['localhost', '127.0.0.1'].contains(url.host));
    return Scaffold(
      appBar: AppBar(title: const Text('Account deletion & recovery'), backgroundColor: AppColors.navy, foregroundColor: AppColors.cream),
      body: !session.isUnderAgeExplorer && allowed
          ? ResourceWebView(url: url.toString())
          : const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Younger profiles are managed by their parent/main account.'))),
      bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(12), child: OutlinedButton(
        onPressed: () async { await session.logout(); if (context.mounted) Navigator.of(context).popUntil((route) => route.isFirst); },
        child: const Text('Sign out after requesting deletion'),
      ))),
    );
  }
}
