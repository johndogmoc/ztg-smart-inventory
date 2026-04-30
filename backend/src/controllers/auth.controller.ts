import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import redis from '../config/redis';
import { successResponse, errorResponse } from '../utils/responseFactory';

const JWT_SECRET = process.env.JWT_SECRET || 'ztg_dev_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'ztg_dev_refresh_secret';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN_DAYS = 7;

// Helper: Generates tokens
const generateTokens = (user: { id: string; role: string }) => {
  const accessToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
  const refreshToken = jwt.sign({ id: user.id, role: user.role }, JWT_REFRESH_SECRET, { expiresIn: `${REFRESH_EXPIRES_IN_DAYS}d` });
  return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Email, password, and role are required.'));
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json(errorResponse('USER_EXISTS', 'A user with this email already exists.'));
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password_hash, first_name, last_name, role }
    });

    const { accessToken, refreshToken } = generateTokens(user);

    // Save refresh token to Redis (Key: ztg_ref_{userId})
    await redis.setex(`ztg_ref_${user.id}`, REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60, refreshToken);

    const { password_hash: _, ...safeUser } = user;
    res.status(201).json(successResponse({ user: safeUser, accessToken, refreshToken }));
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Email and password are required.'));
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid credentials.'));
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json(errorResponse('UNAUTHORIZED', 'Invalid credentials.'));
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await redis.setex(`ztg_ref_${user.id}`, REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60, refreshToken);

    const { password_hash: _, ...safeUser } = user;
    res.json(successResponse({ user: safeUser, accessToken, refreshToken }));
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(errorResponse('VALIDATION_ERROR', 'Refresh token required.'));
    }

    jwt.verify(refreshToken, JWT_REFRESH_SECRET, async (err: any, decoded: any) => {
      if (err) return res.status(403).json(errorResponse('FORBIDDEN', 'Invalid refresh token.'));

      // Validate against Redis cache to prevent token reuse across devices / forced logouts
      const storedToken = await redis.get(`ztg_ref_${decoded.id}`);
      if (storedToken !== refreshToken) {
        return res.status(403).json(errorResponse('FORBIDDEN', 'Refresh token revoked or invalid.'));
      }

      const { accessToken: newAccess, refreshToken: newRefresh } = generateTokens(decoded);
      await redis.setex(`ztg_ref_${decoded.id}`, REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60, newRefresh);

      res.json(successResponse({ accessToken: newAccess, refreshToken: newRefresh }));
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      // Decode immediately just to grab ID (we assume logout token is nominally valid since middleware normally protects /logout, but we can do it safely here)
      const decoded: any = jwt.decode(token);
      if (decoded && decoded.id) {
        await redis.del(`ztg_ref_${decoded.id}`);
      }
    }
    
    res.json(successResponse({ message: 'Successfully logged out.' }));
  } catch (err) {
    next(err);
  }
};
