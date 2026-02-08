import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { JWT_ACCESS_SECRET } from '../config/jwt';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Chưa đăng nhập' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as { id: string; name: string, role: string };
        console.log(JSON.stringify(decoded));
        (req as any).user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Token hết hạn hoặc không hợp lệ' });
    }
};