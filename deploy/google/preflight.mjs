import { readFile,access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath,pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const require = createRequire(path.join(root,'backend/package.json'));
export function validateRuntime(values) {
  const errors = [];
  if (!values || typeof values !== 'object' || Array.isArray(values)) return ['Runtime YAML must be a mapping.'];
  if (values.NODE_ENV !== 'production') errors.push('NODE_ENV must be production.');
  if (!['postgres','postgresql'].includes(values.DATABASE)) errors.push('DATABASE must explicitly select postgres.');
  if (values.PRIVATE_UPLOAD_DRIVER !== 'r2') errors.push('PRIVATE_UPLOAD_DRIVER must be r2.');
  if (!['false','0',false,0].includes(values.ALLOW_PUZZLE_STAGING_HEADER)) errors.push('ALLOW_PUZZLE_STAGING_HEADER must be false.');
  for (const key of ['FIREBASE_PROJECT_ID','R2_ACCOUNT_ID','R2_BUCKET','R2_PUBLIC_BUCKET']) if (typeof values[key] !== 'string' || !values[key].trim() || /YOUR-|PLACEHOLDER/i.test(values[key])) errors.push(`${key} must be configured.`);
  const origin = (value) => { try { const url = new URL(value);return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.pathname === '/' && !['localhost','127.0.0.1'].includes(url.hostname) && !/YOUR-|PLACEHOLDER/i.test(url.hostname); } catch { return false; } };
  if (values.R2_BUCKET && values.R2_BUCKET === values.R2_PUBLIC_BUCKET) errors.push('Public assets and private identity documents must use different buckets.');
  if (!origin(values.R2_PUBLIC_BASE_URL)) errors.push('R2_PUBLIC_BASE_URL must be a configured HTTPS asset origin.');
  else if (new URL(values.R2_PUBLIC_BASE_URL).hostname.endsWith('.r2.cloudflarestorage.com')) errors.push('R2_PUBLIC_BASE_URL must be a public asset URL, not the authenticated R2 S3 endpoint.');
  if (!origin(values.ADMIN_PUBLIC_URL)) errors.push('ADMIN_PUBLIC_URL must be a real HTTPS origin.');
  const origins = String(values.CORS_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  if (!origins.length || origins.some(value => !origin(value))) errors.push('CORS_ORIGINS must contain explicit HTTPS origins.');
  for (const key of Object.keys(values)) if (/^(DATABASE_URL|DIRECT_URL|JWT_SECRET|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|RESEND_API_KEY|MAIL_FROM|FIREBASE_SERVICE_ACCOUNT_JSON|TWILIO_.*)$/.test(key)) errors.push(`${key} must not be embedded in runtime YAML; use Secret Manager.`);
  return errors;
}
export async function loadRuntime(filename) {
  const { parse } = require('yaml');
  let values;
  try { values = parse(await readFile(filename,'utf8'),{ uniqueKeys:true,maxAliasCount:0 }); }
  catch { throw new Error('Runtime YAML cannot be read or parsed. No configuration values were logged.'); }
  const errors = validateRuntime(values);
  if (errors.length) throw new Error(errors.join('\n'));
  return values;
}
export async function preflight(environment = process.env) {
  const errors = [];
  const target = JSON.parse(await readFile(path.join(root,'deploy/google/target.json'),'utf8'));
  if (target.database !== 'postgresql' || target.runtimeDatabase !== 'postgresql' || target.orm !== 'prisma') errors.push('Deployment target must select Prisma/PostgreSQL.');
  for (const key of ['GOOGLE_CLOUD_PROJECT','RUNTIME_SERVICE_ACCOUNT','SCHEDULER_SERVICE_ACCOUNT','RUNTIME_ENV_FILE']) if (!environment[key]) errors.push(`${key} is missing.`);
  if (environment.RUNTIME_SERVICE_ACCOUNT && environment.RUNTIME_SERVICE_ACCOUNT === environment.SCHEDULER_SERVICE_ACCOUNT) errors.push('Runtime and Scheduler service accounts must be separate.');
  if (environment.RUNTIME_ENV_FILE) { try { await loadRuntime(environment.RUNTIME_ENV_FILE); } catch(error) { errors.push(error.message); } }
  const source = path.resolve(environment.FUNCTION_SOURCE_DIR || path.join(root,'.deploy/google-functions'));
  for (const file of ['package.json','package-lock.json','backend/dist/functions.js','admin/dist/index.html','prisma/schema.prisma']) { try { await access(path.join(source,file)); } catch { errors.push(`Prepared bundle missing ${file}.`); } }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const errors = await preflight();
    if (errors.length) { console.error('Deployment preflight blocked:\n'+errors.map(error => '- '+error).join('\n'));process.exitCode=1; }
    else console.log('Local deployment preflight passed. Cloud credentials, billing, IAM and secrets still require verification.');
  } catch { console.error('Deployment preflight could not read the target configuration.');process.exitCode=1; }
}
