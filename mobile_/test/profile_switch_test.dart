import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:teen_aventure/models/auth_session.dart';
import 'package:teen_aventure/services/api_client.dart';
import 'package:teen_aventure/services/family_service.dart';

void main() {
  test('legacy sessions switch only to eligible profiles in an owned family',
      () async {
    SharedPreferences.setMockInitialValues({});
    final api = await ApiClient.create();
    final profiles = [
      {'id': 'managed', 'name': 'Managed'},
      {'id': 'denied', 'name': 'Denied', 'canSwitchProfile': false},
      {'id': 'standalone', 'name': 'Standalone'},
      {'id': 'disabled', 'name': 'Disabled', 'loginDeactivated': true},
      {'id': 'other-family', 'name': 'Other family'},
    ];
    var ownerId = 'another-user';
    api.dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) {
      handler.resolve(Response(
        requestOptions: options,
        data: options.path.endsWith('/auth/me')
            ? {
                'type': 'user',
                'userId': 'parent',
                'familyId': 'family',
                'children': profiles
              }
            : {
                'ownerUserId': ownerId,
                'children': [
                  for (final id in ['managed', 'denied', 'disabled'])
                    {'id': id, 'selfOwned': false, 'canManageLogin': true},
                  {
                    'id': 'standalone',
                    'selfOwned': true,
                    'canManageLogin': false
                  },
                ],
              },
      ));
    }));
    final session = AuthSession(null, FamilyService(api));
    await session.refreshProfile();
    session.chooseParentProfile();

    expect(await session.switchWatchingProfile(), isFalse);
    expect(session.needsProfilePick, isFalse);

    ownerId = 'parent';
    expect(await session.switchWatchingProfile(), isTrue);
    expect(session.needsProfilePick, isTrue);
    expect(session.switchableChildren.map((child) => child.id), ['managed']);
    session.dispose();
  });
}
