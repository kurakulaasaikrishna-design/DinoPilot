import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

type AuthPayload = {
  userId: string;
  restaurantId: string;
  role: 'OWNER' | 'STAFF';
};

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    restaurantId: string;
    role: 'OWNER' | 'STAFF';
    name: string;
    email: string;
  };
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return secret;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const token = authorization.substring(7);

    const payload = jwt.verify(token, getJwtSecret()) as AuthPayload;

    const user = await prisma.user.findFirst({
      where: {
        id: payload.userId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        restaurantId: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: 'User is no longer active',
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    };

    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired authentication token',
    });
  }
}

export function requireRole(...roles: Array<'OWNER' | 'STAFF'>) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'You do not have permission to access this resource',
      });
    }

    next();
  };
}