/**
 * Manual procedure to create an administrator account (HU-001 RN-001).
 * The application never registers accounts; this script runs on the server, outside the app.
 *
 * Usage:  npm run create-admin -- <username>
 * The password is requested twice and is not shown on screen. Only its bcrypt hash is stored (RN-003).
 */
import { createInterface } from 'node:readline';
import { loadEnv } from '../src/config/env.js';
import { initializeDatabase } from '../src/database/conection.js';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';

const isTerminal = Boolean(process.stdin.isTTY);
const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: isTerminal });
let muted = false;
// While muted, what the person types is not echoed (hidden password).
rl._writeToOutput = (text) => {
  if (!muted) rl.output.write(text);
};
const lines = rl[Symbol.asyncIterator]();

async function ask(prompt, { hidden = false } = {}) {
  process.stdout.write(prompt);
  muted = hidden;
  const { value, done } = await lines.next();
  muted = false;
  if (hidden && isTerminal) process.stdout.write('\n');
  if (done) throw new Error('La entrada terminó antes de completar los datos.');
  return value;
}

let db;
try {
  const env = loadEnv();
  db = initializeDatabase(env.databasePath);
  const authService = createAuthService({ repository: createAuthRepository(db) });

  const username = process.argv[2] ?? (await ask('Nombre de usuario: '));
  const password = await ask('Contraseña: ', { hidden: true });
  const confirmation = await ask('Repita la contraseña: ', { hidden: true });
  if (password !== confirmation) throw new Error('Las contraseñas no coinciden. No se creó la cuenta.');

  const account = await authService.createAdmin({ username, password });
  console.log(`Cuenta de Administración creada: "${account.username}" (id ${account.id}).`);
} catch (error) {
  console.error(error.message);
  for (const text of Object.values(error.fields ?? {})) console.error(`- ${text}`);
  process.exitCode = 1;
} finally {
  rl.close();
  db?.close();
}
