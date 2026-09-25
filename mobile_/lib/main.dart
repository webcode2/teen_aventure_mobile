import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/service_locator.dart';
import 'services/api_client.dart';
import 'services/auth_service.dart';
import 'services/content_service.dart';
import 'services/engagement_service.dart';
import 'services/family_service.dart';
import 'services/video_download_service.dart';
import 'models/auth_session.dart';
import 'providers/video_provider.dart';
import 'models/game_controller.dart';
import 'theme.dart';
import 'screens/auth/splash_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark,
      systemNavigationBarColor: AppColors.splash,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  try {
    await ServiceLocator.instance.initialize();
  } catch (e, stack) {
    debugPrint('Service init failed: $e\n$stack');
  }
  runApp(const AskHubTeenApp());
}

class AskHubTeenApp extends StatelessWidget {
  const AskHubTeenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: ServiceLocator.instance.apiClient),
        Provider<AuthService>.value(value: ServiceLocator.instance.authService),
        Provider<ContentService>.value(value: ServiceLocator.instance.contentService),
        Provider<EngagementService>.value(value: ServiceLocator.instance.engagementService),
        Provider<FamilyService>.value(value: ServiceLocator.instance.familyService),
        Provider<VideoDownloadService>.value(value: ServiceLocator.instance.videoDownloadService),
        ChangeNotifierProvider(
          create: (context) => AuthSession(
            context.read<AuthService>(),
            context.read<FamilyService>(),
          )..restore(),
        ),
        ChangeNotifierProvider(
          create: (context) => VideoProvider(
            context.read<ContentService>(),
            context.read<VideoDownloadService>(),
          )..loadContent(),
        ),
        ChangeNotifierProvider(
          create: (_) => GameController()..loadDefaultCanonical(),
        ),
      ],
      child: MaterialApp(
        title: 'Teen Bible Adventures',
        debugShowCheckedModeBanner: false,
        theme: TeenAppTheme.themeData,
        builder: (context, child) {
          final media = MediaQuery.of(context);
          final bumped = AppTextScaler(
            TextScaler.linear(media.textScaler.scale(1.0) * kAppTextScale),
          );
          return MediaQuery(
            data: media.copyWith(textScaler: bumped),
            child: AnnotatedRegion<SystemUiOverlayStyle>(
              value: TeenAppTheme.lightStatusBar,
              child: child ?? const SizedBox.shrink(),
            ),
          );
        },
        home: const SplashScreen(),
      ),
    );
  }
}
