import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const ENV_FILE = path.join(ROOT_DIR, '.env');
const NODE_ENVS = ['development', 'test', 'production'];

/**
 * D-13: lectura nativa del archivo .env con process.loadEnvFile().
 * No sobrescribe variables que ya estén definidas en el sistema.
 */
function loadEnvFileIfPresent() {
  if (!existsSync(ENV_FILE)) {
    return;
  }
  // Algunos editores de Windows guardan UTF-8 con BOM y la primera variable queda con un
  // carácter invisible delante. Se avisa en vez de fallar con un mensaje confuso.
  const start = readFileSync(ENV_FILE).subarray(0, 3);
  if (start[0] === 0xef && start[1] === 0xbb && start[2] === 0xbf) {
    throw new Error('El archivo .env está guardado con BOM. Guárdelo como "UTF-8" sin BOM y vuelva a intentarlo.');
  }
  process.loadEnvFile(ENV_FILE);
}

function required(env, name, problems) {
  const value = (env[name] ?? '').trim();
  if (value === '') {
    problems.push(`Falta la variable obligatoria ${name}.`);
  }
  return value;
}

/**
 * Lee y valida las variables de entorno. Lanza un Error con todos los problemas
 * encontrados para que el servidor no arranque con una configuración incompleta.
 */
export function loadConfig(env = process.env) {
  if (env === process.env) {
    loadEnvFileIfPresent();
  }
  const problems = [];

  const nodeEnv = required(env, 'NODE_ENV', problems);
  if (nodeEnv !== '' && !NODE_ENVS.includes(nodeEnv)) {
    problems.push(`NODE_ENV debe ser uno de: ${NODE_ENVS.join(', ')}.`);
  }

  const portText = required(env, 'PORT', problems);
  const port = Number(portText);
  if (portText !== '' && !(Number.isInteger(port) && port >= 1 && port <= 65535)) {
    problems.push('PORT debe ser un entero entre 1 y 65535.');
  }

  const databasePath = required(env, 'DATABASE_PATH', problems);
  const sessionsDir = required(env, 'SESSIONS_DIR', problems);
  const sessionsDb = required(env, 'SESSIONS_DB', problems);

  const sessionSecret = required(env, 'SESSION_SECRET', problems);
  if (sessionSecret !== '' && sessionSecret.length < 32) {
    problems.push('SESSION_SECRET debe tener al menos 32 caracteres.');
  }

  const trustProxyText = (env.TRUST_PROXY ?? '0').trim() || '0';
  if (!['0', '1'].includes(trustProxyText)) {
    problems.push('TRUST_PROXY debe ser 0 o 1.');
  }

  const allowedOrigin = required(env, 'ALLOWED_ORIGIN', problems);
  if (allowedOrigin !== '') {
    try {
      if (new URL(allowedOrigin).origin !== allowedOrigin) {
        problems.push('ALLOWED_ORIGIN debe ser solo el origen, sin ruta ni barra final (ej. http://localhost:3000).');
      }
    } catch {
      problems.push('ALLOWED_ORIGIN no es una URL válida.');
    }
  }

  if (problems.length > 0) {
    throw new Error(`Configuración inválida (revise su archivo .env):\n- ${problems.join('\n- ')}`);
  }

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    port,
    databasePath: path.resolve(ROOT_DIR, databasePath),
    sessionsDir: path.resolve(ROOT_DIR, sessionsDir),
    sessionsDb,
    sessionSecret,
    trustProxy: trustProxyText === '1',
    allowedOrigin,
    bcryptCost: 12,
    sessionMaxAgeMs: 8 * 60 * 60 * 1000,
  };
}