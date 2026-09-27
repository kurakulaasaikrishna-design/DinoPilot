import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { prisma } from './lib/prisma';
import authRoutes from './auth/auth.routes';

import dashboardRoutes from './dashboard/dashboard.routes';
import menuRoutes from './menu/menu.routes';
import orderRoutes from './orders/order.routes';
import staffOrderRoutes from './staff/staff-order.routes';
import ownerOrderRoutes from './owner/owner-order.routes';
import tableRoutes from './tables/table.routes';

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from './middleware/auth';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  }),
);

app.use(express.json());



// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/owner/dashboard', dashboardRoutes);
app.use('/api/staff/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/staff/orders', staffOrderRoutes);
app.use('/api/owner/orders', ownerOrderRoutes);
app.use('/api/staff/tables', tableRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'restaurant-api',
  });
});

// Public restaurant information
app.get('/api/restaurant', async (_req, res) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      phone: true,
      address: true,
    },
  });

  res.json(restaurant);
});

// Public menu
app.get('/api/menu', async (_req, res) => {
  const restaurant = await prisma.restaurant.findFirst({
    where: {
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!restaurant) {
    return res.status(404).json({
      message: 'Restaurant not configured',
    });
  }

  const categories = await prisma.category.findMany({
    where: {
      restaurantId: restaurant.id,
      isActive: true,
    },
    orderBy: {
      displayOrder: 'asc',
    },
    include: {
      menuItems: {
        where: {
          isActive: true,
        },
        orderBy: {
          displayOrder: 'asc',
        },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          imageUrl: true,
          isVeg: true,
          isAvailable: true,
        },
      },
    },
  });

  res.json(categories);
});

// Protected owner test route
app.get(
  '/api/owner/me',
  requireAuth,
  requireRole('OWNER'),
  (req: AuthenticatedRequest, res) => {
    res.json({
      message: 'Owner authentication successful',
      user: req.user,
    });
  },
);

app.listen(port, '0.0.0.0', () => {
  console.log(`Restaurant API running on port ${port}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
