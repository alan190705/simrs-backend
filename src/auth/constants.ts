export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'fallback-secret-for-simrs-min-32-chars',
  expiresIn: process.env.JWT_ACCESS_TTL || process.env.JWT_EXPIRES_IN || '15m',
  refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000, // refresh token berlaku 7 hari
};