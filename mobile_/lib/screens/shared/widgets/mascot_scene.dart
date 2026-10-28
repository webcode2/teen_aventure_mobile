import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../adventure_assets.dart';
import '../../../providers/hero_copy.dart';

class MascotScene extends StatelessWidget {
  const MascotScene({super.key, this.height = 168, this.abi, this.zach});

  final double height;
  final ImageProvider? abi;
  final ImageProvider? zach;

  @override
  Widget build(BuildContext context) {
    final dashboard = _dashboardHero(context);
    final abiImage = abi ?? dashboard?.abiImage;
    final zachImage = zach ?? dashboard?.zachImage;
    return SizedBox(
      height: height,
      width: double.infinity,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final h = constraints.maxHeight.isFinite && constraints.maxHeight > 0
              ? constraints.maxHeight
              : height;
          final w = constraints.maxWidth.isFinite && constraints.maxWidth > 0
              ? constraints.maxWidth
              : null;
          return _MascotBody(height: h, maxWidth: w, abi: abiImage, zach: zachImage);
        },
      ),
    );
  }
}

HeroCopyController? _dashboardHero(BuildContext context) {
  try {
    return context.watch<HeroCopyController>();
  } catch (_) {
    return null;
  }
}

class _MascotBody extends StatelessWidget {
  const _MascotBody({required this.height, this.maxWidth, this.abi, this.zach});

  final double height;
  final double? maxWidth;
  final ImageProvider? abi;
  final ImageProvider? zach;

  // Pixel aspect from assets/abi.png and assets/zach.png.
  static const _abiAspect = 1214 / 1295;
  static const _zachAspect = 1222 / 1287;
  // Transparent side margins in the source files. Pull them in so the pair sits together.
  static const _abiRightInset = 110 / 1214;
  static const _zachLeftInset = 101 / 1222;

  static const _zachBoost = 10.0;

  @override
  Widget build(BuildContext context) {
    const bottomPad = 2.0;
    final artHeight = (height - bottomPad).clamp(4.0, height);
    final abiArt = (artHeight - _zachBoost).clamp(4.0, artHeight);
    final zachArt = artHeight;
    final abiNatural = abiArt * _abiAspect;
    final zachNatural = zachArt * _zachAspect;
    final naturalWidth = abiNatural + zachNatural - (abiNatural * _abiRightInset + zachNatural * _zachLeftInset);

    var scale = 1.0;
    if (maxWidth != null && naturalWidth > maxWidth!) {
      scale = maxWidth! / naturalWidth;
    }

    final abiHeight = abiArt * scale;
    final zachHeight = zachArt * scale;
    final abiWidth = abiHeight * _abiAspect;
    final zachWidth = zachHeight * _zachAspect;
    final closeBy = abiWidth * _abiRightInset + zachWidth * _zachLeftInset;
    final pairWidth = abiWidth + zachWidth - closeBy;

    return Stack(
      alignment: Alignment.bottomCenter,
      clipBehavior: Clip.hardEdge,
      children: [
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              SizedBox(
                width: pairWidth,
                height: zachHeight + bottomPad,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: 0,
                      bottom: bottomPad,
                      child: _MascotColumn(
                        image: abi ?? const AssetImage(AdventureAssets.abi),
                        fallback: AdventureAssets.abi,
                        imageHeight: abiHeight,
                        imageWidth: abiWidth,
                      ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: bottomPad,
                      child: _MascotColumn(
                        image: zach ?? const AssetImage(AdventureAssets.zach),
                        fallback: AdventureAssets.zach,
                        imageHeight: zachHeight,
                        imageWidth: zachWidth,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MascotColumn extends StatelessWidget {
  const _MascotColumn({
    required this.image,
    required this.fallback,
    required this.imageHeight,
    required this.imageWidth,
  });

  final ImageProvider image;
  final String fallback;
  final double imageHeight;
  final double imageWidth;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: SizedBox(
        width: imageWidth,
        height: imageHeight,
        child: Image(
          image: image,
          width: imageWidth,
          height: imageHeight,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          gaplessPlayback: true,
          errorBuilder: (_, __, ___) => Image.asset(
            fallback,
            width: imageWidth,
            height: imageHeight,
            fit: BoxFit.contain,
            filterQuality: FilterQuality.high,
          ),
        ),
      ),
    );
  }
}
