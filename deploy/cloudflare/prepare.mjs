import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.dirname(fileURLToPath(import.meta.url));
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const bucket = process.env.PUBLIC_CONTENT_BUCKET;
if (!account || !bucket) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and PUBLIC_CONTENT_BUCKET (non-secret deployment configuration).');
const config = JSON.parse(fs.readFileSync(path.join(directory, 'wrangler.example.json'), 'utf8'));
const target = JSON.parse(fs.readFileSync(path.join(directory, 'target.json'), 'utf8'));
const hostname = process.env.FRONTEND_HOSTNAME ?? target.frontendHostname;
if (hostname) {
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(hostname)) throw new Error('FRONTEND_HOSTNAME must be a hostname without a scheme or path.');
  config.routes = [{ pattern: hostname.toLowerCase(), custom_domain: true }];
  config.workers_dev = true;
}
const adminHostname = process.env.ADMIN_HOSTNAME ?? target.adminHostname;
if (adminHostname) {
  if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(adminHostname)) throw new Error('ADMIN_HOSTNAME must be a valid hostname.');
  config.routes = [...(config.routes ?? []), { pattern: adminHostname.toLowerCase(), custom_domain: true }];
  config.vars.ADMIN_HOSTNAME = adminHostname.toLowerCase();
  config.assets.run_worker_first = ['/', '/app/*', '/api/*', '/join/*', '/zack.png'];
}
config.account_id = account;
config.r2_buckets[0].bucket_name = bucket;
fs.writeFileSync(path.join(directory, 'wrangler.generated.json'), JSON.stringify(config, null, 2) + '\n');
