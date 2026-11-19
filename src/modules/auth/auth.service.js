import bcrypt from 'bcryptjs'
 
const DEFAULT_BCRYPT_COST = 12
const USERNAME_MIN_LENGTH = 3
const USERNAME_MAX_LENGTH = 50
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 72
const PASSWORD_MAX_BYTES = 72
const INVALID_CREDENTIALS_MESSAGE = 'Usuario o contraseña incorrectos.'

function businessError(code, message, fields) {
  const error = new Error(message)
  error.code = code
  if (fields) error.fields = fields
  return error
}
 
function countCharacters(text) {
  return Array.from(text).length
}
 
function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim().toLowerCase() : ''
}
 
function validateNewAccount(username, password) {
  const fields = {}
 
  if (!username) {
    fields.username = 'El nombre de usuario es obligatorio.'
  } else {
    const length = countCharacters(username)
    if (length < USERNAME_MIN_LENGTH || length > USERNAME_MAX_LENGTH) {
      fields.username = `El nombre de usuario debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`
    }
  }
 
  if (typeof password !== 'string' || password === '') {
    fields.password = 'La contraseña es obligatoria.'
  } else {
    const length = countCharacters(password)
    if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) {
      fields.password = `La contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres.`
    } else if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
      fields.password = `La contraseña no puede superar ${PASSWORD_MAX_BYTES} bytes (la ñ y las vocales con tilde ocupan 2 bytes cada una).`
    }
  }
 
  return fields
}
 
function isOutsideAccountLimits(username, password) {
  const usernameLength = countCharacters(username)
  const passwordLength = countCharacters(password)
  return (
    usernameLength < USERNAME_MIN_LENGTH ||
    usernameLength > USERNAME_MAX_LENGTH ||
    passwordLength < PASSWORD_MIN_LENGTH ||
    passwordLength > PASSWORD_MAX_LENGTH ||
    Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES
  )
}
 
export function createAuthService({ repository, bcryptCost = DEFAULT_BCRYPT_COST }) {
  const dummyHashPromise = bcrypt.hash('dummy-password-for-timing', bcryptCost)
 
  return {
    async createAdmin({ username, password }) {
      const normalizedUsername = normalizeUsername(username)
      const fields = validateNewAccount(normalizedUsername, password)
      if (Object.keys(fields).length > 0) {
        throw businessError('VALIDATION_ERROR', 'Los datos de la cuenta no son válidos.', fields)
      }
 
      if (repository.findByUsername(normalizedUsername)) {
        throw businessError('CONFLICT', 'Ya existe una cuenta con ese nombre de usuario.')
      }
 
      const passwordHash = await bcrypt.hash(password, bcryptCost)
      try {
        return repository.insert(normalizedUsername, passwordHash)
      } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          throw businessError('CONFLICT', 'Ya existe una cuenta con ese nombre de usuario.')
        }
        throw error
      }
    },

    async login({ username, password }) {
      const normalizedUsername = normalizeUsername(username);
      const fields = {};
      if (!normalizedUsername) fields.username = 'El nombre de usuario es obligatorio.'
      if (typeof password !== 'string' || password === '') {
        fields.password = 'La contraseña es obligatoria.'
      }
      if (Object.keys(fields).length > 0) {
        throw businessError('VALIDATION_ERROR', 'Los datos de inicio de sesión no son válidos.', fields)
      }
 
      if (isOutsideAccountLimits(normalizedUsername, password)) {
        throw businessError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
      }
      const account = repository.findByUsername(normalizedUsername)
      const hashToCompare = account ? account.passwordHash : await dummyHashPromise
      const passwordMatches = await bcrypt.compare(password, hashToCompare)
 
      if (!account || !passwordMatches) {
        throw businessError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE)
      }
      return { id: account.id, username: account.username }
    },
  }
}