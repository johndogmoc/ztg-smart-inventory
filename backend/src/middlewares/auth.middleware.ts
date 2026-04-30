import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/responseFactory';

const JWT_SECRET = process.env.JWT_SECRET || 'ztg_dev_secret';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(errorResponse('UNAUTHORIZED', 'Missing access token.'));
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json(errorResponse('FORBIDDEN', 'Invalid or expired access token.'));
    }

    // Attach user payload
    req.user = {
      id: decoded.id,
      role: decoded.role,
    };
    
    next();
  });
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json(errorResponse('FORBIDDEN', `Insufficient permissions. Requires one of: ${roles.join(', ')}`));
    }
    next();
  };
};
