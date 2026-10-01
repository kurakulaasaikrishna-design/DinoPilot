import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma.js';
import { createOrder } from './order.service.js';

const router = Router();

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),

  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1),
});

router.post('/', async (req, res) => {
  try {
    const input = createOrderSchema.parse(req.body);

    const restaurant = await prisma.restaurant.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (!restaurant) {
      return res.status(404).json({
        message: 'Restaurant not configured',
      });
    }

    const order = await createOrder(restaurant.id, input);

    return res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        subtotal: order.subtotal,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        items: order.items,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid order request',
        errors: error.issues,
      });
    }

    console.error('Create order error:', error);

    return res.status(400).json({
      message:
        error instanceof Error
          ? error.message
          : 'Failed to create order',
    });
  }
});

export default router;

