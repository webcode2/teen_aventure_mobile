import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppColors {
  static const Color navy = Color(0xFF011F3B);
  /// Same as app bar navy — native + Flutter splash must match this.
  static const Color splash = navy;
  static const Color cream = Color(0xFFfcfefc);
  static const Color orange = Color(0xFFE87524);
  static const Color forestGreen = Color(0xFF2F7D5A);
  static const Color gold = Color(0xFFF4B942);
  static const Color teal = Color(0xFF159A9C);
  static const Color heartEmpty = Color(0xFF704A2E);
  static const Color correctFill = Color(0xFFE9F4EC);
  static const Color answerFill = Color(0xFFFFFDF7);

  // Backward-compatible names used across existing widgets
  static const Color sagePrimary = forestGreen;
  static const Color sageContainer = Color(0xFFE9F4EC);
  static const Color terracottaAccent = orange;
  static const Color terracottaContainer = Color(0xFFF8E7DF);
  static const Color puzzleTeal = teal;
  static const Color puzzleTealTint = Color(0xFFE6F6F6);
  static const Color amberGold = gold;
  static const Color solvedTile = Color(0xFFD9EBD4);
  static const Color background = cream;
  static const Color surface = Color(0xFFFFFDF7);
  static const Color surfaceVariant = Color(0xFFF6E7C8);
  static const Color border = Color(0xFFE6D7B8);
  static const Color borderDark = Color(0xFFD9C7A0);
  static const Color textPrimary = navy;
  static const Color textSecondary = Color(0xFF3E5A73);
  static const Color textMuted = Color(0xFF6B7C8A);
}

class AppRadii {
  static const double card = 18;
  static const BorderRadius cardRadius =
      BorderRadius.all(Radius.circular(card));
}

/// Extra logical pixels added to every font size after text scaling.
const double kAppFontBump = 1;

TextTheme _appleText(TextTheme base) {
  TextStyle soften(TextStyle? style, {double tracking = -0.3}) =>
      (style ?? const TextStyle()).copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: tracking,
        height: 1.25,
      );

  return base.copyWith(
    displayLarge: soften(base.displayLarge, tracking: -0.8),
    displayMedium: soften(base.displayMedium, tracking: -0.6),
    displaySmall: soften(base.displaySmall, tracking: -0.5),
    headlineLarge: soften(base.headlineLarge, tracking: -0.6),
    headlineMedium: soften(base.headlineMedium, tracking: -0.4),
    headlineSmall: soften(base.headlineSmall, tracking: -0.3),
    titleLarge: soften(base.titleLarge, tracking: -0.4),
    titleMedium: soften(base.titleMedium, tracking: -0.2),
    titleSmall: soften(base.titleSmall),
    bodyLarge: (base.bodyLarge ?? const TextStyle()).copyWith(
      fontWeight: FontWeight.w400,
      letterSpacing: -0.2,
      height: 1.35,
    ),
    bodyMedium: (base.bodyMedium ?? const TextStyle()).copyWith(
      fontWeight: FontWeight.w400,
      letterSpacing: -0.15,
      height: 1.35,
    ),
    bodySmall: (base.bodySmall ?? const TextStyle()).copyWith(
      fontWeight: FontWeight.w400,
      letterSpacing: -0.1,
      height: 1.3,
    ),
    labelLarge: (base.labelLarge ?? const TextStyle())
        .copyWith(fontWeight: FontWeight.w600),
    labelMedium: (base.labelMedium ?? const TextStyle())
        .copyWith(fontWeight: FontWeight.w600),
    labelSmall: (base.labelSmall ?? const TextStyle())
        .copyWith(fontWeight: FontWeight.w500),
  );
}

final ThemeData naturalTonesTheme = ThemeData(
  useMaterial3: true,
  typography: Typography.material2021(platform: TargetPlatform.iOS),
  textTheme: _appleText(
    Typography.blackCupertino.apply(
      bodyColor: AppColors.navy,
      displayColor: AppColors.navy,
    ),
  ),
  primaryTextTheme: Typography.whiteCupertino,
  scaffoldBackgroundColor: AppColors.cream,
  colorScheme: const ColorScheme(
    brightness: Brightness.light,
    primary: AppColors.navy,
    onPrimary: AppColors.cream,
    primaryContainer: AppColors.navy,
    onPrimaryContainer: AppColors.cream,
    secondary: AppColors.orange,
    onSecondary: Colors.white,
    secondaryContainer: Color(0xFFF8E7DF),
    onSecondaryContainer: AppColors.navy,
    tertiary: AppColors.teal,
    onTertiary: Colors.white,
    tertiaryContainer: Color(0xFFE6F6F6),
    onTertiaryContainer: AppColors.teal,
    surface: AppColors.surface,
    onSurface: AppColors.navy,
    surfaceVariant: AppColors.surfaceVariant,
    onSurfaceVariant: AppColors.textSecondary,
    outline: AppColors.border,
    outlineVariant: AppColors.borderDark,
    error: Color(0xFFBA1A1A),
    onError: Colors.white,
    errorContainer: Color(0xFFFFDAD6),
    onErrorContainer: Color(0xFF410E0B),
    surfaceContainerHighest: AppColors.surfaceVariant,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.navy,
    foregroundColor: AppColors.cream,
    elevation: 0,
    scrolledUnderElevation: 0,
    systemOverlayStyle: TeenAppTheme.lightStatusBar,
    titleTextStyle: TextStyle(
      color: AppColors.cream,
      fontSize: 17,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.4,
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.orange,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: AppRadii.cardRadius),
      textStyle:
          const TextStyle(fontWeight: FontWeight.w600, letterSpacing: -0.2),
    ),
  ),
  cardTheme: const CardThemeData(
    shape: RoundedRectangleBorder(borderRadius: AppRadii.cardRadius),
  ),
);

class TeenAppTheme {
  static const Color deepPurple = AppColors.navy;
  static const Color violet = AppColors.orange;
  static const Color lavender = AppColors.cream;
  static const Color gold = AppColors.gold;
  static const Color freshGreen = AppColors.forestGreen;
  static const Color cream = AppColors.cream;
  static const Color midnight = AppColors.navy;

  /// Navy behind the status bar, white clock/battery/icons on every screen.
  static const SystemUiOverlayStyle lightStatusBar = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
  );

  static ThemeData get themeData => naturalTonesTheme;

  static BoxDecoration get headerGradient {
    return const BoxDecoration(color: AppColors.navy);
  }
}
