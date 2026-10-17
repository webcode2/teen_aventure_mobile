import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

/// Hardware identity sent with FCM registration so admins can tell phones apart.
class DeviceIdentity {
  const DeviceIdentity({
    this.deviceName,
    this.manufacturer,
    this.model,
  });

  final String? deviceName;
  final String? manufacturer;
  final String? model;

  Map<String, String> toJson() {
    final out = <String, String>{};
    final name = deviceName?.trim();
    final make = manufacturer?.trim();
    final mod = model?.trim();
    if (name != null && name.isNotEmpty) out['deviceName'] = name;
    if (make != null && make.isNotEmpty) out['manufacturer'] = make;
    if (mod != null && mod.isNotEmpty) out['model'] = mod;
    return out;
  }
}

Future<DeviceIdentity> readDeviceIdentity() async {
  if (kIsWeb) return const DeviceIdentity();
  final plugin = DeviceInfoPlugin();
  try {
    if (defaultTargetPlatform == TargetPlatform.android) {
      final info = await plugin.androidInfo;
      final make = info.manufacturer.trim();
      final model = info.model.trim();
      final product = info.product.trim();
      final name = [
        if (make.isNotEmpty) make,
        if (model.isNotEmpty && !model.toLowerCase().contains(make.toLowerCase())) model,
      ].join(' ').trim();
      return DeviceIdentity(
        deviceName: name.isNotEmpty ? name : (product.isNotEmpty ? product : null),
        manufacturer: make.isNotEmpty ? make : null,
        model: model.isNotEmpty ? model : (product.isNotEmpty ? product : null),
      );
    }
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      final info = await plugin.iosInfo;
      final name = info.name.trim();
      final model = info.utsname.machine.trim();
      final product = info.model.trim();
      return DeviceIdentity(
        deviceName: name.isNotEmpty ? name : null,
        manufacturer: 'Apple',
        model: model.isNotEmpty ? model : (product.isNotEmpty ? product : null),
      );
    }
  } catch (e) {
    if (kDebugMode) {
      debugPrint('DeviceIdentity: $e');
    }
  }
  return const DeviceIdentity();
}
