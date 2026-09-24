import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';

/// Vendored contracts fixtures must match contracts/MANIFEST.json hashes.
/// Synced via: `(cd contracts && npm run prepare:all)`.
void main() {
  test('vendored puzzle fixtures match MANIFEST sha256', () async {
    final manifestFile = File('test/fixtures/contracts/MANIFEST.json');
    expect(
      manifestFile.existsSync(),
      isTrue,
      reason: 'Run: cd contracts && npm run prepare:all',
    );

    final manifest =
        jsonDecode(await manifestFile.readAsString()) as Map<String, dynamic>;
    expect(manifest['algorithm'], 'sha256');
    final files = Map<String, String>.from(manifest['files'] as Map);

    final root = Directory('test/fixtures/contracts');
    for (final entry in files.entries) {
      final local = File('${root.path}/${entry.key}');
      expect(local.existsSync(), isTrue, reason: 'Missing vendored ${entry.key}');
      final digest = sha256.convert(await local.readAsBytes()).toString();
      expect(digest, entry.value, reason: 'Hash mismatch for ${entry.key}');
    }
  });
}
