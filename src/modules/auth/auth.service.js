import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError, validationError } from '../../utils/errors.js';

const MAX_PASSWORD_BYTES = 72; // límite real de bcrypt (D-12)

export function createAuthService({ authRepository, bcryptCost }) {
  // Hash simulado del mismo coste: si el usuario no existe se compara igual,
  // para que el tiempo de respuesta no revele si la cuenta existe.
  const dummyHash = bcrypt.hashSync(randomUUID(), bcryptCost);

  const invalidCredentials = () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos.');

  return {
    /** HU-001: valida los campos y comprueba las credenciales. Devuelve la cuenta (sin hash). */
    async login({ username, password }) {
      const fields = {};
      const usernameKey = typeof username === 'string' ? username.trim().toLowerCase() : '';
      if (usernameKey === '') {
        fields.username = 'El nombre de usuario es obligatorio.';
      }
      if (typeof password !== 'string' || password === '') {
        fields.password = 'La contraseña es obligatoria.';
      }
      if (Object.keys(fields).length > 0) {
        throw validationError(fields);
      }

      const admin = authRepository.findByUsername(usernameKey);
      // Una contraseña de más de 72 bytes nunca pudo guardarse: se trata como incorrecta.
      const tooLong = Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES;
      const hashToCompare = admin && !tooLong ? admin.passwordHash : dummyHash;
      const matches = await bcrypt.compare(tooLong ? 'x' : password, hashToCompare);
      if (!admin || tooLong || !matches) {
        throw invalidCredentials();
      }
      return { id: admin.id, username: admin.username };
    },

    /** T-08: crea una cuenta de Administración. Solo la usa scripts/create-admin.js. */
    async createAccount({ username, password }) {
      const fields = {};
      const usernameKey = typeof username === 'string' ? username.trim().toLowerCase() : '';
      if (usernameKey.length < 3 || usernameKey.length > 50) {
        fields.username = 'El nombre de usuario debe tener entre 3 y 50 caracteres.';
      }
      if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
        fields.password = 'La contraseña debe tener entre 8 y 72 caracteres.';
      } else if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
        fields.password = 'La contraseña no puede superar 72 bytes (los caracteres con tilde ocupan más de un byte).';
      }
      if (Object.keys(fields).length > 0) {
        throw validationError(fields);
      }
      if (authRepository.findByUsername(usernameKey)) {
        throw validationError({ username: 'Ese nombre de usuario ya existe.' });
      }

      const passwordHash = await bcrypt.hash(password, bcryptCost);
      const id = authRepository.insert(usernameKey, passwordHash);
      return { id, username: usernameKey };
    },
  };
}