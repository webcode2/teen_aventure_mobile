import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntime } from './preflight.mjs';
const valid = { NODE_ENV:'production',DATABASE:'postgres',PRIVATE_UPLOAD_DRIVER:'r2',ALLOW_PUZZLE_STAGING_HEADER:'false',FIREBASE_PROJECT_ID:'tbadventure-f712a',R2_ACCOUNT_ID:'configured-account',R2_BUCKET:'private-bucket',R2_PUBLIC_BUCKET:'public-bucket',R2_PUBLIC_BASE_URL:'https://media.example.com',ADMIN_PUBLIC_URL:'https://app.example.com',CORS_ORIGINS:'https://app.example.com,https://admin.example.com' };
test('accepts explicit PostgreSQL with private R2 and HTTPS origins',() => assert.deepEqual(validateRuntime(valid),[]));
test('blocks accidental Firestore selection, open origins and staging headers',() => {
  const errors = validateRuntime({ ...valid,DATABASE:'firestore',CORS_ORIGINS:'*',ALLOW_PUZZLE_STAGING_HEADER:true });
  assert.equal(errors.length,3);
});
test('rejects secret values without including them in diagnostics',() => {
  const errors = validateRuntime({ ...valid,DATABASE_URL:'must-never-appear',JWT_SECRET:'must-never-appear' });
  assert.equal(errors.length,2);assert.ok(!errors.join('').includes('must-never-appear'));
});
test('rejects local endpoints, placeholders and local private storage',() => {
  const errors = validateRuntime({ ...valid,ADMIN_PUBLIC_URL:'http://localhost:5173',R2_ACCOUNT_ID:'YOUR-R2-ACCOUNT',PRIVATE_UPLOAD_DRIVER:'local' });
  assert.equal(errors.length,3);
});

test('rejects exposing the private identity bucket as the public asset bucket',() => assert.ok(validateRuntime({ ...valid,R2_PUBLIC_BUCKET:valid.R2_BUCKET }).some(error => error.includes('different buckets'))));

test('rejects using the authenticated R2 S3 endpoint as the public asset origin', () => assert.ok(validateRuntime({ ...valid,R2_PUBLIC_BASE_URL:'https://account.r2.cloudflarestorage.com' }).some(error => error.includes('authenticated R2 S3 endpoint'))));
