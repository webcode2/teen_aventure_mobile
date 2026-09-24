import 'package:flutter/foundation.dart';

import 'game_controller.dart';

import '../services/auth_service.dart';

import '../services/family_service.dart';

import '../services/push_hooks.dart';



enum AppShell { loggedOut, parent, teen }



class FamilyChildProfile {

  final String id;

  final String name;

  final String ageBand;

  final String? email;

  final bool independentLogin;



  const FamilyChildProfile({

    required this.id,

    required this.name,

    required this.ageBand,

    this.email,

    this.independentLogin = false,

  });



  bool get isUnderAge => ageBand == 'CHILD';



  factory FamilyChildProfile.fromJson(Map<String, dynamic> json) {

    return FamilyChildProfile(

      id: json['id'] as String,

      name: json['name'] as String? ?? 'Child',

      ageBand: json['ageBand'] as String? ?? 'CHILD',

      email: json['email'] as String?,

      independentLogin: json['independentLogin'] as bool? ?? false,

    );

  }

}



class AssignedClass {

  final String id;

  final String name;

  final String kind;

  final String? ownerUserId;



  const AssignedClass({

    required this.id,

    required this.name,

    this.kind = 'FAMILY',

    this.ownerUserId,

  });



  bool get isFamily => kind == 'FAMILY';



  factory AssignedClass.fromJson(Map<String, dynamic> json) {

    final parsed = AssignedClass.tryFromJson(json);

    if (parsed == null) {

      throw FormatException('AssignedClass missing id', json);

    }

    return parsed;

  }



  static AssignedClass? tryFromJson(Map<String, dynamic> json) {

    final id = json['id'];

    if (id is! String || id.isEmpty) return null;

    return AssignedClass(

      id: id,

      name: json['name'] as String? ?? 'Class',

      kind: json['kind'] as String? ?? 'FAMILY',

      ownerUserId: json['ownerUserId'] as String?,

    );

  }

}



List<String> _rolesForTest(

  AppShell shell,

  String? familyId,

  List<FamilyChildProfile> children,

) {

  if (shell == AppShell.teen) return ['CHILD'];

  final roles = <String>[];

  if (familyId != null || children.isNotEmpty) {

    roles.add('MAIN_ACCOUNT');

  }

  return roles;

}



/// JWT-backed session. Production shells use this, not [GameController.switchRole].

class AuthSession extends ChangeNotifier {

  AuthSession(this._auth, this._family);



  AuthSession._test({

    required this.ready,

    required this.authenticated,

    required this.shell,

    this.displayName,

    this.email,

    this.ageBand,

    this.canRestoreParent = false,

    this.children = const [],

    List<AssignedClass> assignedClasses = const [],

    this.familyId,

    this.userType,

    this.roles = const [],

    this.profilePicked = false,

  })  : _auth = null,

        _family = null,

        _assignedClasses = assignedClasses;



  factory AuthSession.test({

    bool authenticated = false,

    AppShell shell = AppShell.teen,

    String? displayName,

    String? email,

    String? ageBand,

    bool canRestoreParent = false,

    List<FamilyChildProfile> children = const [],

    List<AssignedClass> assignedClasses = const [],

    String? familyId,

    String? childId,

    List<String>? roles,

    bool profilePicked = false,

  }) {

    final resolvedFamilyId = familyId == null

        ? (shell == AppShell.parent || children.isNotEmpty ? 'family-test' : null)

        : (familyId.isEmpty ? null : familyId);

    final inferred = roles ?? _rolesForTest(shell, resolvedFamilyId, children);

    final resolvedShell =

        !authenticated ? AppShell.loggedOut : shell;

    final session = AuthSession._test(

      ready: true,

      authenticated: authenticated,

      shell: resolvedShell,

      displayName: displayName,

      email: email,

      ageBand: ageBand,

      canRestoreParent: canRestoreParent,

      children: children,

      assignedClasses: assignedClasses,

      familyId: resolvedFamilyId,

      userType: shell == AppShell.teen ? 'child' : 'user',

      roles: inferred,

      profilePicked: profilePicked,

    );

    session.childId = childId ?? (shell == AppShell.teen ? 'child-test' : null);

    return session;

  }



  final AuthService? _auth;

  final FamilyService? _family;



  bool ready = false;

  bool authenticated = false;

  AppShell shell = AppShell.loggedOut;

  String? userType;

  String? userId;

  String? childId;

  String? familyId;

  String? displayName;

  String? email;

  String? ageBand;

  String? platformRole;

  bool canRestoreParent = false;

  List<FamilyChildProfile> children = const [];

  List<AssignedClass> _assignedClasses = const [];

  List<String> roles = const [];

  bool profilePicked = false;



  List<AssignedClass> get assignedClasses =>

      _assignedClasses.where((c) => c.isFamily).toList();



  List<AssignedClass> get allAssignedClasses => List.unmodifiable(_assignedClasses);



  set assignedClasses(List<AssignedClass> value) => _assignedClasses = value;



  AssignedClass? get familyClass {

    for (final cls in assignedClasses) {

      if (cls.isFamily) return cls;

    }

    return null;

  }



  List<FamilyChildProfile> get underAgeChildren =>

      children.where((c) => c.isUnderAge).toList();



  bool get hasParentRole =>
      roles.contains('MAIN_ACCOUNT') ||
      roles.contains('PARENT') ||
      (userType != 'child' && familyId != null);



  List<UserRole> get availableHomes {

    if (userType == 'child' || shell == AppShell.teen) return const [UserRole.student];

    return const [UserRole.parent];

  }



  String get accountKindLabel {

    if (userType == 'child' || shell == AppShell.teen) {

      if (ageBand == 'CHILD') return 'Under-age explorer';

      if (ageBand == 'TEEN') return 'Teen explorer';

      return 'Explorer';

    }

    return 'Main account';

  }



  UserRole get userRole {

    if (userType == 'child' || shell == AppShell.teen) return UserRole.student;

    return UserRole.parent;

  }



  bool get isParent => hasParentRole && userType != 'child';

  bool get canSwitchHomes => false;

  bool get isChild => userType == 'child' || shell == AppShell.teen;

  bool get isAdult => !isChild;

  bool get isAdultTeen => isChild && ageBand == 'TEEN';

  bool get isUnderAgeExplorer => isChild && !isAdultTeen;

  bool get needsFamilySetup => isAdult && familyId == null;

  bool get canEditProfile => authenticated && !isUnderAgeExplorer;

  bool get needsProfilePick =>

      authenticated && isParent && children.isNotEmpty && !profilePicked;



  void chooseParentProfile() {

    profilePicked = true;

    notifyListeners();

  }

  /// Re-open the family profile picker so a parent can switch who is watching.
  void requestProfileSwitch() {
    if (!isParent || children.isEmpty) return;
    profilePicked = false;
    notifyListeners();
  }

  /// Drawer "Switch account": return to parent (if needed) and show the picker.
  Future<void> switchWatchingProfile() async {
    if (canRestoreParent) {
      await restoreParentAccount();
      profilePicked = false;
      notifyListeners();
      return;
    }
    requestProfileSwitch();
  }



  void selectHome(UserRole role) {

    if (!availableHomes.contains(role)) return;

    if (role == UserRole.parent) shell = AppShell.parent;

    if (role == UserRole.student) shell = AppShell.teen;

    notifyListeners();

  }



  void _applyRolesToShell() {

    if (userType == 'child') {

      shell = AppShell.teen;

      return;

    }

    shell = AppShell.parent;

  }



  Future<void> restore() async {

    final auth = _auth;

    if (auth == null) {

      ready = true;

      notifyListeners();

      return;

    }

    authenticated = await auth.isAuthenticated();

    userType = await auth.getUserType();

    userId = await auth.getUserId();

    childId = await auth.getChildId();

    familyId = await auth.getFamilyId();

    if (authenticated) {

      final token = await auth.getAuthToken();

      if (token != null && token.isNotEmpty) {

        await auth.apiClient.setAuthToken(token);

      }

      await refreshProfile();

      await _flushPendingProfile();

    } else {

      shell = AppShell.loggedOut;

      roles = const [];

      profilePicked = false;

    }

    ready = true;

    notifyListeners();

    await _syncPush();

  }



  Future<void> refreshProfile() async {

    final family = _family;

    if (family == null) return;

    try {

      final me = await family.getSession();

      userType = me['type'] as String?;

      userId = me['userId'] as String?;

      childId = me['childId'] as String?;

      familyId = me['familyId'] as String?;

      displayName = me['name'] as String?;

      email = me['email'] as String?;

      ageBand = me['ageBand'] as String?;

      platformRole = me['platformRole'] as String?;

      canRestoreParent = await _auth?.canRestoreParent() ?? false;

      final kids = me['children'];

      if (kids is List) {

        children = kids

            .whereType<Map<String, dynamic>>()

            .map(FamilyChildProfile.fromJson)

            .toList();

      } else {

        children = const [];

      }

      final classes = me['assignedClasses'];

      if (classes is List) {

        assignedClasses = classes

            .whereType<Map<String, dynamic>>()

            .map(AssignedClass.tryFromJson)

            .whereType<AssignedClass>()

            .toList();

      } else {

        assignedClasses = const [];

      }

      final rawRoles = me['roles'];

      if (rawRoles is List && rawRoles.isNotEmpty) {

        roles = rawRoles.map((e) => e.toString()).toList();

      } else {

        roles = sessionRolesFromProfile(

          isChild: userType == 'child',

          familyId: familyId,

          childrenCount: children.length,

        );

      }

      authenticated = true;

      _applyRolesToShell();

    } catch (_) {

      shell = userType == 'child' ? AppShell.teen : AppShell.parent;

    }

    notifyListeners();

  }



  /// Applies locally always. Uploads when online; otherwise queues for re-upload.

  /// Returns true when the server accepted the update.

  Future<bool> updateProfile({

    required String name,

    required String email,

    String? password,

  }) async {

    displayName = name.trim();

    this.email = email.trim();

    notifyListeners();



    final auth = _auth;

    if (auth == null) {

      return true;

    }



    try {

      await auth.updateProfile(name: name, email: email, password: password);

      await auth.clearPendingProfileUpdate();

      return true;

    } catch (_) {

      await auth.savePendingProfileUpdate(

        name: name,

        email: email,

        password: password,

      );

      return false;

    }

  }



  Future<void> _flushPendingProfile() async {

    final auth = _auth;

    if (auth == null) return;

    final pending = await auth.loadPendingProfileUpdate();

    if (pending == null) return;

    final name = pending['name'] as String?;

    final mail = pending['email'] as String?;

    if (name != null && name.isNotEmpty) displayName = name;

    if (mail != null && mail.isNotEmpty) email = mail;

    final ok = await auth.flushPendingProfileUpdate();

    if (ok) notifyListeners();

  }



  Future<void> afterLogin() => restore();



  Future<void> switchToUnderageChild(String childId) async {

    await _auth?.switchToUnderageChild(childId);

    profilePicked = true;

    await restore();

  }



  Future<void> restoreParentAccount() async {

    await _auth?.restoreParentAccount();

    await restore();

  }



  Future<void> _syncPush() async {

    try {

      await PushHooks.sync(userId: userId, childId: childId);

    } catch (_) {}

  }



  Future<void> logout() async {

    try {

      await PushHooks.logout();

    } catch (_) {}

    await _auth?.logout();

    authenticated = false;

    shell = AppShell.loggedOut;

    userType = null;

    userId = null;

    childId = null;

    familyId = null;

    displayName = null;

    email = null;

    ageBand = null;

    platformRole = null;

    canRestoreParent = false;

    children = const [];

    assignedClasses = const [];

    roles = const [];

    profilePicked = false;

    ready = true;

    notifyListeners();

  }

}



List<String> sessionRolesFromProfile({

  required bool isChild,

  String? familyId,

  int childrenCount = 0,

}) {

  if (isChild) return ['CHILD'];

  final roles = <String>[];

  if (familyId != null || childrenCount > 0) roles.add('MAIN_ACCOUNT');

  return roles;

}

