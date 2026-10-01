import { Router } from 'express';
import { z } from 'zod';

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth.js';

import {
  getStaffOrders,
  getStaffOrder,
  assignTable,
  updateOrderStatus,
} from './staff-order.service.js';

const router = Router();

router.use(requireAuth, requireRole('OWNER', 'STAFF'));

/**
 * GET /api/staff/orders
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: 'Authentication required',
      });
    }

    const status = req.query.status as string | undefined;

    const allowedStatuses = [
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'COMPLETED',
      'CANCELLED',
    ];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid order status',
      });
    }

    const orders = await getStaffOrders(
      req.user.restaurantId,
      status,
    );

    return res.json(orders);
  } catch (error) {
    console.error('Get staff orders error:', error);

    return res.status(500).json({
      message: 'Failed to load orders',
    });
  }
});

/**
 * GET /api/staff/orders/:id
 */
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const order = await getStaffOrder(
        req.user.restaurantId,
        String(req.params.id),
      );

      return res.json(order);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Order not found'
      ) {
        return res.status(404).json({
          message: 'Order not found',
        });
      }

      console.error('Get staff order error:', error);

      return res.status(500).json({
        message: 'Failed to load order',
      });
    }
  },
);

/**
 * POST /api/staff/orders/:id/assign-table
 */
router.post(
  '/:id/assign-table',
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const body = z
        .object({
          tableNumber: z
            .string()
            .trim()
            .min(1)
            .max(20),
        })
        .parse(req.body);

      const order = await assignTable(
        req.user.restaurantId,
        String(req.params.id),
        body.tableNumber,
      );

      return res.json({
        message: 'Table assigned successfully',
        order,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid table number',
          errors: error.issues,
        });
      }

      if (
        error instanceof Error &&
        error.message === 'Order not found'
      ) {
        return res.status(404).json({
          message: 'Order not found',
        });
      }

      console.error('Assign table error:', error);

      return res.status(500).json({
        message: 'Failed to assign table',
      });
    }
  },
);

/**
 * PATCH /api/staff/orders/:id/status
 */
router.patch(
  '/:id/status',
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const body = z
        .object({
          status: z.enum([
            'CREATED',
            'PAYMENT_PENDING',
            'PAID',
            'CONFIRMED',
            'PREPARING',
            'READY',
            'COMPLETED',
            'CANCELLED',
          ]),
        })
        .parse(req.body);

      const order = await updateOrderStatus(
        req.user.restaurantId,
        String(req.params.id),
        req.user.id,
        body.status,
      );

      return res.json({
        message: 'Order status updated successfully',
        order,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid order status',
          errors: error.issues,
        });
      }

      if (
        error instanceof Error &&
        error.message === 'Order not found'
      ) {
        return res.status(404).json({
          message: 'Order not found',
        });
      }

      console.error('Update order status error:', error);

      return res.status(500).json({
        message: 'Failed to update order status',
      });
    }
  },
);

export default router;

