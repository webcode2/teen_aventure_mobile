import 'screens/shared/widgets/maintenance_notice.dart';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
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
import 'providers/current_quest_provider.dart';
import 'providers/hero_copy.dart';
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
  WidgetsBinding.instance.addPostFrameCallback((_) {
    unawaited(
        ServiceLocator.instance.pushService.start().catchError((Object _) {
      if (kDebugMode) debugPrint('Optional notification setup is unavailable.');
    }));
  });
}

class AskHubTeenApp extends StatelessWidget {
  const AskHubTeenApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiClient>.value(value: ServiceLocator.instance.apiClient),
        Provider<AuthService>.value(value: ServiceLocator.instance.authService),
        Provider<ContentService>.value(
            value: ServiceLocator.instance.contentService),
        Provider<EngagementService>.value(
            value: ServiceLocator.instance.engagementService),
        Provider<FamilyService>.value(
            value: ServiceLocator.instance.familyService),
        Provider<VideoDownloadService>.value(
            value: ServiceLocator.instance.videoDownloadService),
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
          // Week puzzle is bound via GameController.startWeek / openPuzzle —
          // do not preload the global catalogue puzzle (wrong pattern).
          create: (_) => GameController(),
        ),
        ChangeNotifierProvider(
          create: (context) => HeroCopyController(
            context.read<ApiClient>(),
            ServiceLocator.instance.prefs,
          )..refresh(),
        ),
        ChangeNotifierProxyProvider<AuthSession, CurrentQuestProvider>(
          create: (context) => CurrentQuestProvider(
            context.read<ContentService>(),
            prefs: ServiceLocator.instance.prefs,
            onVideoPoints: context.read<GameController>().applyActivityPoints,
          ),
          update: (_, session, quest) => quest!
            ..syncIdentity(
              authenticated: session.ready && session.authenticated,
              userId: session.userId,
              childId: session.effectiveChildId,
            ),
        ),
      ],
      child: MaterialApp(
        title: 'Teen Bible Adventures',
        debugShowCheckedModeBanner: false,
        theme: TeenAppTheme.themeData,
        // Chrome/trackpad need mouse drag so home pull-to-refresh works on web.
        scrollBehavior: const MaterialScrollBehavior().copyWith(
          dragDevices: {
            PointerDeviceKind.touch,
            PointerDeviceKind.mouse,
            PointerDeviceKind.trackpad,
          },
        ),
        builder: (context, child) {
          final media = MediaQuery.of(context);
          final cms = context.watch<HeroCopyController>();
          final bumped = AppTextScaler(
            TextScaler.linear(media.textScaler.scale(1.0) * kAppTextScale),
          );
          return MediaQuery(
            data: media.copyWith(textScaler: bumped),
            child: AnnotatedRegion<SystemUiOverlayStyle>(
              value: TeenAppTheme.lightStatusBar,
              child: Column(children: [
                MaintenanceNotice(
                    enabled: cms.maintenanceMode,
                    message: cms.maintenanceMessage),
                Expanded(
                    child: cms.maintenanceMode
                        ? Builder(
                            builder: (innerContext) => MediaQuery.removePadding(
                                context: innerContext,
                                removeTop: true,
                                child: child ?? const SizedBox.shrink()))
                        : child ?? const SizedBox.shrink()),
              ]),
            ),
          );
        },
        home: const SplashScreen(),
      ),
    );
  }
}
