import { Router } from 'express';
import { requireAuth, requireRole, } from '../middleware/auth';
import { getOwnerDashboard } from './dashboard.service';
const router = Router();
router.get('/', requireAuth, requireRole('OWNER'), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required',
            });
        }
        const dashboard = await getOwnerDashboard(req.user.restaurantId);
        return res.json(dashboard);
    }
    catch (error) {
        console.error('Owner dashboard error:', error);
        return res.status(500).json({
            message: 'Failed to load owner dashboard',
        });
    }
});
export default router;
