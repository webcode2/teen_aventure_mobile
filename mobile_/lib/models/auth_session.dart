import 'package:flutter/foundation.dart';

import '../family/family_account_rules.dart';
import 'game_controller.dart';

import '../services/api_client.dart';

import '../services/auth_service.dart';

import '../services/family_service.dart';

import '../services/push_hooks.dart';



enum AppShell { loggedOut, parent, teen, teacher }



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

  /// Family teen with their own login — switch uses email/password and ends the parent session.
  bool get usesEmailPasswordSwitch => independentLogin && !isUnderAge;

  /// Short label for lists (never "Under-age").
  String get explorerBandLabel => isUnderAge ? 'Explorer' : 'Teen explorer';

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

    // /me uses kind=CLASS + groupKind=FAMILY|CHURCH|CUSTOM; prefer groupKind when present.
    final rawKind = (json['groupKind'] as String? ??
            json['kind'] as String? ??
            'FAMILY')
        .toUpperCase();

    // ClassGroup rows may still arrive as CUSTOM; membership APIs expect CLASS.
    final kind = rawKind == 'CUSTOM' ? 'CLASS' : rawKind;

    return AssignedClass(

      id: id,

      name: json['name'] as String? ?? 'Class',

      kind: kind,

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

    bool mustChangePassword = false,

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

    session.mustChangePassword = mustChangePassword;

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

  /// When a parent stays on the family profile, quest awards still need an explorer.
  String? scoringChildId;

  String? familyId;

  String? displayName;

  String? email;

  String? ageBand;

  int? birthYear;

  /// Adult app account without a birth year: adult features are blocked until it is set.

  bool needsBirthYear = false;

  /// Pastor-created staff must replace the temporary password before using the app.

  bool mustChangePassword = false;

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

    // Teachers use the adult shell; assigned groups live under Groups.
    return const [UserRole.parent];

  }



  String get accountKindLabel {

    if (userType == 'child' || shell == AppShell.teen) {

      if (ageBand == 'CHILD') return 'Explorer';

      if (ageBand == 'TEEN') return 'Explorer';

      return 'Explorer';

    }

    if (shell == AppShell.teacher || roles.contains('TEACHER')) return 'Teacher';

    return '';

  }



  UserRole get userRole {

    if (userType == 'child' || shell == AppShell.teen) return UserRole.student;

    return UserRole.parent;

  }



  bool get isParent => hasParentRole && userType != 'child';

  /// Church TEACHER role on the adult shell (assigned classes under Classes).
  bool get isTeacher =>
      !isChild && (shell == AppShell.teacher || roles.contains('TEACHER'));

  /// Child JWT id, or the explorer a parent awards quest points to.
  String? get effectiveChildId => childId ?? scoringChildId;

  bool get canSwitchHomes => false;

  bool get isChild => userType == 'child' || shell == AppShell.teen;

  bool get isAdult => !isChild;

  bool get isAdultTeen => isChild && ageBand == 'TEEN';

  bool get isUnderAgeExplorer => isChild && !isAdultTeen;

  bool get needsFamilySetup => isAdult && familyId == null;

  /// Adults only. Standalone teens join groups; they do not create them.
  bool get canCreateGroups =>
      authenticated &&
      canCreateGroupsRule(
        isAdult: isAdult,
        platformRole: platformRole,
        needsBirthYear: needsBirthYear,
      );

  bool get canEditProfile => authenticated && !isUnderAgeExplorer;

  bool get needsProfilePick =>

      authenticated && isParent && children.isNotEmpty && !profilePicked;



  void chooseParentProfile() {

    profilePicked = true;

    // Family home is the adult shell — do not credit the first child by default.
    // /me.childId on a parent JWT is only a scoring alias; never treat it as a child session.
    childId = null;

    scoringChildId = null;

    notifyListeners();

  }

  void _ensureScoringChild() {

    if (childId != null) {

      scoringChildId = childId;

      return;

    }

    // Parent JWT without an active child profile: keep scoring unbound so
    // Family-home activities cannot silently land on a subaccount.
    if (userType != 'child' && shell != AppShell.teen) {

      scoringChildId = null;

      return;

    }

    if (scoringChildId != null && children.any((c) => c.id == scoringChildId)) {

      return;

    }

    scoringChildId = children.isNotEmpty ? children.first.id : null;

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

    if (role == UserRole.teacher) shell = AppShell.teacher;

    notifyListeners();

  }



  void _applyRolesToShell() {

    if (userType == 'child') {

      shell = AppShell.teen;

      return;

    }

    // Teachers keep the adult shell; assigned church groups appear under Groups.
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

      // Parent /me may include childId as the adult's transitioned scoring row.
      // That must not become AuthSession.childId (child JWT identity) or Family
      // home will keep awarding the explorer after chooseParentProfile.
      final meChildId = me['childId'] as String?;

      if (userType == 'child') {

        childId = meChildId;

      } else {

        childId = null;

      }

      familyId = me['familyId'] as String?;

      if (profilePicked || childId != null) _ensureScoringChild();

      displayName = me['name'] as String?;

      email = me['email'] as String?;

      ageBand = me['ageBand'] as String?;

      birthYear = (me['birthYear'] as num?)?.toInt();

      needsBirthYear = me['needsBirthYear'] == true;

      mustChangePassword = me['mustChangePassword'] == true;

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



  /// Name-only edits apply locally and queue for upload when offline.

  /// Email, password, PIN and birth-year changes go straight to the server and

  /// throw [ApiException] when refused (e.g. wrong current password).

  /// Returns true when the server accepted the update.

  Future<bool> updateProfile({

    required String name,

    required String email,

    String? password,

    String? currentPassword,

    int? birthYear,

  }) async {

    final auth = _auth;

    final sensitive = email.trim() != (this.email ?? '') ||

        (password?.isNotEmpty ?? false) ||

        birthYear != null;

    if (auth == null) {

      displayName = name.trim();

      this.email = email.trim();

      notifyListeners();

      return true;

    }

    try {

      await auth.updateProfile(

        name: name,

        email: email,

        password: password,

        currentPassword: currentPassword,

        birthYear: birthYear,

      );

      await auth.clearPendingProfileUpdate();

    } on ApiException catch (e) {

      if (sensitive || e.statusCode != null) rethrow;

      displayName = name.trim();

      notifyListeners();

      await auth.savePendingProfileUpdate(name: name, email: this.email ?? email);

      return false;

    }

    displayName = name.trim();

    this.email = email.trim();

    if (birthYear != null) {

      this.birthYear = birthYear;

      needsBirthYear = false;

    }

    if (password?.isNotEmpty ?? false) {

      mustChangePassword = false;

    }

    notifyListeners();

    return true;

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

    scoringChildId = null;

    familyId = null;

    displayName = null;

    email = null;

    ageBand = null;

    birthYear = null;

    needsBirthYear = false;

    mustChangePassword = false;

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

