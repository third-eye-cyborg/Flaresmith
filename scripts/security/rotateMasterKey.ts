// T155: Master Encryption Key Rotation Script (placeholder)
// Generates a new MASTER_ENCRYPTION_KEY value and prints it; external process should update Cloudflare secret.
import { randomBytes } from 'crypto';

function main() {
  const newKey = randomBytes(48).toString('hex');
  console.log(JSON.stringify({ rotated: true, masterKey: newKey }));
  console.error('IMPORTANT: Update the Cloudflare Worker secret MASTER_ENCRYPTION_KEY and re-deploy.');
}

main();
