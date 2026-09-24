import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Official Teen Bible Adventures art from `mobile/assets`.
/// Replace Abi/Zack files in-place from the client Drive; do not generate new mascots.
/// https://drive.google.com/drive/folders/1cVB8Adi47rtke1emmEYB2Ho1rqKw3LXT
class AdventureAssets {
  /// Canonical wordmark from `assets/logo1.svg`.
  static const logo = 'assets/logo1.svg';
  static const abi = 'assets/abi.png';
  static const zack = 'assets/zack.png';
  static const worldMap = 'assets/maps/world_map.png';
  static const questMap = 'assets/maps/quest_map.html';

  static bool isRaster(String asset) {
    final lower = asset.toLowerCase();
    return lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp');
  }
}

final _svgReady = <String, String>{};
final _svgLoading = <String, Future<String>>{};

/// Strips SVG features [flutter_svg] cannot paint (C2PA metadata, CSS filters).
@visibleForTesting
String cleanAdventureSvg(String raw) {
  return raw
      .replaceAll(RegExp(r'<metadata>[\s\S]*?</metadata>'), '')
      .replaceAll(RegExp(r'<filter[\s\S]*?</filter>'), '')
      .replaceAll(RegExp(r'\sfilter="url\([^"]*\)"'), '');
}

Future<String> loadAdventureSvg(String asset) {
  final ready = _svgReady[asset];
  if (ready != null) return Future.value(ready);
  return _svgLoading.putIfAbsent(asset, () async {
    final cleaned = cleanAdventureSvg(await rootBundle.loadString(asset));
    _svgReady[asset] = cleaned;
    return cleaned;
  });
}

class AdventureArt extends StatelessWidget {
  const AdventureArt(
    this.asset, {
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.contain,
    this.alignment = Alignment.center,
    this.color,
  });

  final String asset;
  final double? width;
  final double? height;
  final BoxFit fit;
  final Alignment alignment;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    if (AdventureAssets.isRaster(asset)) {
      return Image.asset(
        asset,
        key: ValueKey(asset),
        width: width,
        height: height,
        fit: fit,
        alignment: alignment,
        filterQuality: FilterQuality.high,
        color: color,
        colorBlendMode: color == null ? null : BlendMode.srcIn,
      );
    }

    final cached = _svgReady[asset];
    if (cached != null) {
      return _picture(cached);
    }
    return FutureBuilder<String>(
      future: loadAdventureSvg(asset),
      builder: (context, snapshot) {
        if (!snapshot.hasData) {
          return SizedBox(width: width, height: height);
        }
        return _picture(snapshot.data!);
      },
    );
  }

  Widget _picture(String svg) {
    return SvgPicture.string(
      svg,
      key: ValueKey(asset),
      width: width,
      height: height,
      fit: fit,
      alignment: alignment,
      allowDrawingOutsideViewBox: true,
      colorFilter:
          color == null ? null : ColorFilter.mode(color!, BlendMode.srcIn),
    );
  }
}
