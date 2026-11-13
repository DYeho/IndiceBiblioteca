const NODE_ENVS = ['development', 'test', 'production']
const REQUIRED = ['NODE_ENV', 'PORT', 'DATABASE_PATH', 'SESSIONS_DIR', 'SESSIONS_DB', 'SESSION_SECRET', 'ALLOWED_ORIGIN']
const MIN_SECRET_LENGTH = 32

export function loadEnv(source = process.env) {
  if (source === process.env) {
    try {
      process.loadEnvFile()
    } catch (error) {
      if (error.code !== 'ENOENT') throw error 
    }
  }
 
  const problems = [];
  for (const name of REQUIRED) {
    if (!source[name] || source[name].trim() === '') problems.push(`${name} is required.`)
  }
 
  if (source.NODE_ENV && !NODE_ENVS.includes(source.NODE_ENV)) {
    problems.push(`NODE_ENV must be one of: ${NODE_ENVS.join(', ')}.`)
  }
  const port = Number(source.PORT)
  if (source.PORT && !(Number.isInteger(port) && port >= 1 && port <= 65535)) {
    problems.push('PORT must be an integer between 1 and 65535.')
  }
  if (source.SESSION_SECRET && source.SESSION_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(`SESSION_SECRET must have at least ${MIN_SECRET_LENGTH} characters.`)
  }
  const trustProxy = source.TRUST_PROXY ?? '0'
  if (!['0', '1'].includes(trustProxy)) {
    problems.push('TRUST_PROXY must be 0 or 1.')
  }
 
  if (problems.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${problems.join('\n- ')}`);
  }
 
  return {
    nodeEnv: source.NODE_ENV,
    port,
    databasePath: source.DATABASE_PATH,
    sessionsDir: source.SESSIONS_DIR,
    sessionsDb: source.SESSIONS_DB,
    sessionSecret: source.SESSION_SECRET,
    trustProxy: trustProxy === '1',
    allowedOrigin: source.ALLOWED_ORIGIN,
  }
}