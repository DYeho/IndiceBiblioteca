import { Writable } from 'node:stream';
import readline from 'node:readline/promises';
import { loadConfig } from '../src/config/env.js';
import { openDatabase, assertSchemaReady } from '../src/database/connection.js';
import { createAuthRepository } from '../src/modules/auth/auth.repository.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';

// Salida "silenciable": mientras `muted` es true no se muestra lo que se escribe (contraseña).
let muted = false;
const output = new Writable({
  write(chunk, encoding, callback) {
    if (!muted) {
      process.stdout.write(chunk, encoding);
    }
    callback();
  },
});

const rl = readline.createInterface({ input: process.stdin, output, terminal: Boolean(process.stdin.isTTY) });

async function ask(question, { hidden = false } = {}) {
  process.stdout.write(question);
  muted = hidden;
  const answer = await rl.question('');
  muted = false;
  if (hidden) {
    process.stdout.write('\n');
  }
  return answer;
}

let db;
try {
  const config = loadConfig();
  db = openDatabase(config.databasePath);
  assertSchemaReady(db);

  const username = await ask('Nombre de usuario (3 a 50 caracteres): ');
  const password = await ask('Contraseña (8 a 72 caracteres): ', { hidden: true });
  const confirmation = await ask('Repita la contraseña: ', { hidden: true });

  if (password !== confirmation) {
    throw new Error('Las contraseñas no coinciden. No se creó ninguna cuenta.');
  }

  const authService = createAuthService({
    authRepository: createAuthRepository(db),
    bcryptCost: config.bcryptCost,
  });
  const account = await authService.createAccount({ username, password });
  console.log(`Cuenta de Administración creada: ${account.username}`);
} catch (error) {
  // Los errores de validación traen `fields`; nunca se imprime la contraseña.
  const details = error.fields ? `\n- ${Object.values(error.fields).join('\n- ')}` : '';
  console.error(`${error.message}${details}`);
  process.exitCode = 1;
} finally {
  rl.close();
  db?.close();
}