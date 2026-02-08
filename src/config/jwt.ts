// src/config/jwt.ts
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'your-access-secret-key';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret-key';
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN ?? '30m';
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d';

// Print JWT configuration values
console.log('\n=== JWT Configuration ===');
console.log('ACCESS_TOKEN_EXPIRES_IN:', ACCESS_TOKEN_EXPIRES_IN);
console.log('REFRESH_TOKEN_EXPIRES_IN:', REFRESH_TOKEN_EXPIRES_IN);
console.log('JWT_ACCESS_SECRET:', JWT_ACCESS_SECRET ? '******' : 'Not set');
console.log('JWT_REFRESH_SECRET:', JWT_REFRESH_SECRET ? '******' : 'Not set');
console.log('========================\n');

// Check environment variables after they are loaded
if (!process.env.JWT_ACCESS_SECRET) {
    console.warn('Warning: JWT_ACCESS_SECRET is not set in environment variables');
}
if (!process.env.JWT_REFRESH_SECRET) {
    console.warn('Warning: JWT_REFRESH_SECRET is not set in environment variables');
}