import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_client.dart';
import 'auth_service.dart';
import 'content_service.dart';
import 'engagement_service.dart';
import 'family_service.dart';
import 'video_download_service.dart';
import 'push_hooks.dart';
import 'push_service.dart';

/// Service Locator for managing dependencies
class ServiceLocator {
  static ServiceLocator? _instance;
  static ServiceLocator get instance => _instance ??= ServiceLocator._();

  ServiceLocator._();

  ApiClient? _apiClient;
  AuthService? _authService;
  ContentService? _contentService;
  EngagementService? _engagementService;
  FamilyService? _familyService;
  VideoDownloadService? _videoDownloadService;
  PushService? _pushService;
  SharedPreferences? _prefs;
  FlutterSecureStorage? _secureStorage;
  Connectivity? _connectivity;

  /// Initialize all services
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    _secureStorage = const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock_this_device),
    );
    _connectivity = Connectivity();

    _apiClient = await ApiClient.create();
    _authService = AuthService(_apiClient!, _secureStorage!);
    _contentService = ContentService(_apiClient!);
    _engagementService = EngagementService(_apiClient!);
    _familyService = FamilyService(_apiClient!);
    _videoDownloadService = VideoDownloadService(_prefs!, _connectivity!);
    _pushService = PushService(_apiClient!);
    PushHooks.onSync = _pushService!.syncIdentity;
    PushHooks.onLogout = _pushService!.logout;
    await _pushService!.start();
  }

  /// Get API Client
  ApiClient get apiClient {
    if (_apiClient == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _apiClient!;
  }

  /// Get Auth Service
  AuthService get authService {
    if (_authService == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _authService!;
  }

  /// Get Content Service
  ContentService get contentService {
    if (_contentService == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _contentService!;
  }

  /// Get Engagement Service
  EngagementService get engagementService {
    if (_engagementService == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _engagementService!;
  }

  FamilyService get familyService {
    if (_familyService == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _familyService!;
  }

  PushService get pushService {
    if (_pushService == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _pushService!;
  }

  /// Get Video Download Service
  VideoDownloadService get videoDownloadService {
    if (_videoDownloadService == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _videoDownloadService!;
  }

  /// Get SharedPreferences
  SharedPreferences get prefs {
    if (_prefs == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _prefs!;
  }

  /// Get Secure Storage
  FlutterSecureStorage get secureStorage {
    if (_secureStorage == null) {
      throw StateError('ServiceLocator not initialized. Call initialize() first.');
    }
    return _secureStorage!;
  }

  /// Reset all services (useful for testing or logout)
  void reset() {
    _apiClient = null;
    _authService = null;
    _contentService = null;
    _engagementService = null;
    _familyService = null;
    _videoDownloadService = null;
    _pushService = null;
    PushHooks.unbind();
    _prefs = null;
    _secureStorage = null;
    _connectivity = null;
  }
}

/// Provider for ServiceLocator
class ServicesProvider extends StatelessWidget {
  final Widget child;

  const ServicesProvider({
    super.key,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: ServiceLocator.instance.initialize(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const MaterialApp(
            home: Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
          );
        }
        if (snapshot.hasError) {
          return MaterialApp(
            home: Scaffold(
              body: Center(child: Text('Error initializing services: ${snapshot.error}')),
            ),
          );
        }
        return child;
      },
    );
  }
}