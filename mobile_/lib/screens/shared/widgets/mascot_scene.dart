import 'package:flutter/material.dart';
import '../../../adventure_assets.dart';

class MascotScene extends StatelessWidget {
  const MascotScene({super.key, this.height = 168});

  final double height;

  @override
  Widget build(BuildContext context) {
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
          return _MascotBody(height: h, maxWidth: w);
        },
      ),
    );
  }
}

class _MascotBody extends StatelessWidget {
  const _MascotBody({required this.height, this.maxWidth});

  final double height;
  final double? maxWidth;

  // Pixel aspect from assets/abi.png and assets/zack.png.
  static const _abiAspect = 1214 / 1295;
  static const _zackAspect = 1222 / 1287;
  // Transparent side margins in the source files. Pull them in so the pair sits together.
  static const _abiRightInset = 110 / 1214;
  static const _zackLeftInset = 101 / 1222;

  static const _zackBoost = 10.0;

  @override
  Widget build(BuildContext context) {
    const bottomPad = 2.0;
    final artHeight = (height - bottomPad).clamp(4.0, height);
    final abiArt = (artHeight - _zackBoost).clamp(4.0, artHeight);
    final zackArt = artHeight;
    final abiNatural = abiArt * _abiAspect;
    final zackNatural = zackArt * _zackAspect;
    final naturalWidth = abiNatural + zackNatural - (abiNatural * _abiRightInset + zackNatural * _zackLeftInset);

    var scale = 1.0;
    if (maxWidth != null && naturalWidth > maxWidth!) {
      scale = maxWidth! / naturalWidth;
    }

    final abiHeight = abiArt * scale;
    final zackHeight = zackArt * scale;
    final abiWidth = abiHeight * _abiAspect;
    final zackWidth = zackHeight * _zackAspect;
    final closeBy = abiWidth * _abiRightInset + zackWidth * _zackLeftInset;
    final pairWidth = abiWidth + zackWidth - closeBy;

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
                height: zackHeight + bottomPad,
                child: Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Positioned(
                      left: 0,
                      bottom: bottomPad,
                      child: _MascotColumn(
                        image: AdventureAssets.abi,
                        imageHeight: abiHeight,
                        imageWidth: abiWidth,
                      ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: bottomPad,
                      child: _MascotColumn(
                        image: AdventureAssets.zack,
                        imageHeight: zackHeight,
                        imageWidth: zackWidth,
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
    required this.imageHeight,
    required this.imageWidth,
  });

  final String image;
  final double imageHeight;
  final double imageWidth;

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: SizedBox(
        width: imageWidth,
        height: imageHeight,
        child: AdventureArt(
          image,
          width: imageWidth,
          height: imageHeight,
        ),
      ),
    );
  }
}
