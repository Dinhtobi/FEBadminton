import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import {
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
    ACCESS_TOKEN_EXPIRES_IN,
    REFRESH_TOKEN_EXPIRES_IN
} from '../config/jwt';

export function generateAccessToken(payload: object) {
    const options: SignOptions = { expiresIn: ACCESS_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, JWT_ACCESS_SECRET as Secret, options);
}

export function generateRefreshToken(payload: object) {
    const options: SignOptions = { expiresIn: REFRESH_TOKEN_EXPIRES_IN as jwt.SignOptions['expiresIn'] };
    return jwt.sign(payload, JWT_REFRESH_SECRET as Secret, options);
}
