import 'package:flutter/material.dart';
import '../../../adventure_assets.dart';

/// App wordmark. Always renders [AdventureAssets.logo] (`assets/logo1.svg`).
class AdventureLogo extends StatelessWidget {
  const AdventureLogo({super.key, this.height = 68});

  final double height;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Teen Bible Adventures',
      child: AdventureArt(
        AdventureAssets.logo,
        height: height,
      ),
    );
  }
}
