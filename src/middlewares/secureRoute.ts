// middleware/secureRoute.ts
import { authenticateJWT } from './auth.middleware';
import { authorizeRole } from './authorize.middleware';
import { RequestHandler } from 'express';

export const secureRoute = (...roles: string[]): RequestHandler[] => [
    authenticateJWT,
    authorizeRole(...roles)
];
