// middleware/authorize.ts

import { Response, NextFunction } from 'express';
import { ForbiddenResponse } from '../common/responseType';
import { AuthenticatedRequest } from '../types/express';

export const authorizeRole = (...allowedRoles: string[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            res.status(403).json({ message: 'Do not permission' });
        }
        // if (!req.user) {
        //     res.status(403).json({ message: 'Do not permission' });
        // }
        next();
    };
};
