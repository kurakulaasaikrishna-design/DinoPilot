import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { getOwnerOrders } from './owner-order.service';
const router = Router();
router.use(requireAuth, requireRole('OWNER'));
const allowedStatuses = [
    'CREATED',
    'PAYMENT_PENDING',
    'PAID',
    'CONFIRMED',
    'PREPARING',
    'READY',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
];
router.get('/', async (req, res) => {
    try {
        const status = typeof req.query.status === 'string'
            ? req.query.status
            : undefined;
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: 'Invalid order status',
            });
        }
        const orders = await getOwnerOrders(req.user.restaurantId, status);
        return res.json(orders);
    }
    catch (error) {
        console.error('Owner orders error:', error);
        return res.status(500).json({
            message: 'Failed to load orders',
        });
    }
});
export default router;
