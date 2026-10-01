import { Router } from 'express';
import { z } from 'zod';
import { createTable, deleteTable, getTables, updateTable, } from './table.service';
import { requireAuth, requireRole } from '../middleware/auth';
const router = Router();
router.use(requireAuth, requireRole('OWNER', 'STAFF'));
// GET /api/staff/tables
router.get('/', async (req, res) => {
    try {
        const tables = await getTables(req.user.restaurantId);
        return res.json(tables);
    }
    catch (error) {
        return res.status(500).json({
            message: error instanceof Error
                ? error.message
                : 'Failed to fetch tables',
        });
    }
});
// POST /api/staff/tables
router.post('/', async (req, res) => {
    try {
        const body = z
            .object({
            tableNumber: z.string().trim().min(1),
        })
            .parse(req.body);
        const table = await createTable(req.user.restaurantId, body);
        return res.status(201).json(table);
    }
    catch (error) {
        return res.status(400).json({
            message: error instanceof Error
                ? error.message
                : 'Failed to create table',
        });
    }
});
// PATCH /api/staff/tables/:id
router.patch('/:id', async (req, res) => {
    try {
        const body = z
            .object({
            tableNumber: z.string().trim().min(1).optional(),
            isActive: z.boolean().optional(),
        })
            .parse(req.body);
        const table = await updateTable(req.user.restaurantId, req.params.id, body);
        return res.json(table);
    }
    catch (error) {
        return res.status(400).json({
            message: error instanceof Error
                ? error.message
                : 'Failed to update table',
        });
    }
});
// DELETE /api/staff/tables/:id
router.delete('/:id', async (req, res) => {
    try {
        const table = await deleteTable(req.user.restaurantId, req.params.id);
        return res.json(table);
    }
    catch (error) {
        return res.status(400).json({
            message: error instanceof Error
                ? error.message
                : 'Failed to deactivate table',
        });
    }
});
export default router;
