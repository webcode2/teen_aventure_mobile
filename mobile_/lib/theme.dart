import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

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

/// Global bump for hardcoded `fontSize`s that skip the theme.
const double kAppTextScale = 1.0;

/// Extra logical pixels added to every font size after [kAppTextScale].
const double kAppFontBump = 0;

/// Applies [kAppTextScale], then adds [kAppFontBump] to the result.
class AppTextScaler extends TextScaler {
  const AppTextScaler(this.inner, {this.bump = kAppFontBump});

  final TextScaler inner;
  final double bump;

  @override
  double scale(double fontSize) => inner.scale(fontSize) + bump;

  @override
  double get textScaleFactor => scale(16) / 16;

  @override
  bool operator ==(Object other) =>
      other is AppTextScaler && other.bump == bump && other.inner == inner;

  @override
  int get hashCode => Object.hash(inner, bump);
}

TextTheme _teenText(TextTheme base) {
  TextStyle display(TextStyle? style, {double tracking = -0.2}) =>
      (style ?? const TextStyle()).copyWith(
        fontWeight: FontWeight.w600,
        letterSpacing: tracking,
        height: 1.2,
      );

  TextStyle body(TextStyle? style) => (style ?? const TextStyle()).copyWith(
        fontWeight: FontWeight.w400,
        letterSpacing: 0,
        height: 1.4,
      );

  return base.copyWith(
    displayLarge:
        display(base.displayLarge, tracking: -0.4).copyWith(fontSize: 36),
    displayMedium:
        display(base.displayMedium, tracking: -0.3).copyWith(fontSize: 30),
    displaySmall: display(base.displaySmall).copyWith(fontSize: 26),
    headlineLarge: display(base.headlineLarge).copyWith(fontSize: 24),
    headlineMedium: display(base.headlineMedium).copyWith(fontSize: 22),
    headlineSmall: display(base.headlineSmall).copyWith(fontSize: 20),
    titleLarge: display(base.titleLarge).copyWith(fontSize: 20),
    titleMedium: display(base.titleMedium).copyWith(fontSize: 17),
    titleSmall: display(base.titleSmall).copyWith(fontSize: 15),
    bodyLarge: body(base.bodyLarge).copyWith(fontSize: 17),
    bodyMedium: body(base.bodyMedium).copyWith(fontSize: 15),
    bodySmall: body(base.bodySmall).copyWith(fontSize: 13),
    labelLarge: (base.labelLarge ?? const TextStyle())
        .copyWith(fontWeight: FontWeight.w600, fontSize: 15),
    labelMedium: (base.labelMedium ?? const TextStyle())
        .copyWith(fontWeight: FontWeight.w600, fontSize: 13),
    labelSmall: (base.labelSmall ?? const TextStyle())
        .copyWith(fontWeight: FontWeight.w500, fontSize: 12),
  );
}

final ThemeData naturalTonesTheme = ThemeData(
  useMaterial3: true,
  typography: Typography.material2021(platform: TargetPlatform.iOS),
  textTheme: _teenText(
    GoogleFonts.fredokaTextTheme(
      Typography.blackCupertino.apply(
        bodyColor: AppColors.navy,
        displayColor: AppColors.navy,
      ),
    ),
  ),
  primaryTextTheme: GoogleFonts.fredokaTextTheme(Typography.whiteCupertino),
  scaffoldBackgroundColor: AppColors.cream,
  fontFamily: GoogleFonts.fredoka().fontFamily,
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
  appBarTheme: AppBarTheme(
    backgroundColor: AppColors.navy,
    foregroundColor: AppColors.cream,
    elevation: 0,
    scrolledUnderElevation: 0,
    systemOverlayStyle: TeenAppTheme.lightStatusBar,
    titleTextStyle: GoogleFonts.fredoka(
      color: AppColors.cream,
      fontSize: 20,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.2,
    ),
  ),
  filledButtonTheme: FilledButtonThemeData(
    style: FilledButton.styleFrom(
      backgroundColor: AppColors.orange,
      foregroundColor: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      shape: RoundedRectangleBorder(borderRadius: AppRadii.cardRadius),
      textStyle: GoogleFonts.fredoka(
        fontWeight: FontWeight.w600,
        fontSize: 16,
        letterSpacing: 0,
      ),
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
