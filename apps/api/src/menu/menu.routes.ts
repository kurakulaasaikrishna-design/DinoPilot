import { Router } from 'express';
import { z } from 'zod';

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from '../middleware/auth';

import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  getMenu,
  updateCategory,
  updateMenuItem,
  updateMenuItemAvailability,
} from './menu.service';

const router = Router();

const categorySchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const categoryUpdateSchema = categorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

const menuItemSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  isVeg: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

const menuItemUpdateSchema = menuItemSchema.partial().extend({
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
});

// Customer/staff readable menu
router.get(
  '/',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const menu = await getMenu(req.user.restaurantId);

      return res.json(menu);
    } catch (error) {
      console.error('Get menu error:', error);

      return res.status(500).json({
        message: 'Failed to load menu',
      });
    }
  },
);

// Create category
router.post(
  '/categories',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const data = categorySchema.parse(req.body);

      const category = await createCategory(
        req.user.restaurantId,
        data,
      );

      return res.status(201).json(category);
    } catch (error) {
      console.error('Create category error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid category data',
          errors: error.issues,
        });
      }

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create category',
      });
    }
  },
);

// Update category
router.patch(
  '/categories/:id',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const data = categoryUpdateSchema.parse(req.body);

      const category = await updateCategory(
        req.user.restaurantId,
        req.params.id,
        data,
      );

      return res.json(category);
    } catch (error) {
      console.error('Update category error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid category data',
          errors: error.issues,
        });
      }

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update category',
      });
    }
  },
);

// Delete category
router.delete(
  '/categories/:id',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      await deleteCategory(
        req.user.restaurantId,
        req.params.id,
      );

      return res.json({
        message: 'Category deleted successfully',
      });
    } catch (error) {
      console.error('Delete category error:', error);

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete category',
      });
    }
  },
);

// Create menu item
router.post(
  '/items',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const data = menuItemSchema.parse(req.body);

      const item = await createMenuItem(
        req.user.restaurantId,
        data,
      );

      return res.status(201).json(item);
    } catch (error) {
      console.error('Create menu item error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid menu item data',
          errors: error.issues,
        });
      }

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create menu item',
      });
    }
  },
);

// Update menu item
router.patch(
  '/items/:id',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const data = menuItemUpdateSchema.parse(req.body);

      const item = await updateMenuItem(
        req.user.restaurantId,
        req.params.id,
        data,
      );

      return res.json(item);
    } catch (error) {
      console.error('Update menu item error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid menu item data',
          errors: error.issues,
        });
      }

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update menu item',
      });
    }
  },
);

// Delete menu item
router.delete(
  '/items/:id',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      await deleteMenuItem(
        req.user.restaurantId,
        req.params.id,
      );

      return res.json({
        message: 'Menu item deleted successfully',
      });
    } catch (error) {
      console.error('Delete menu item error:', error);

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete menu item',
      });
    }
  },
);

// Availability toggle
router.patch(
  '/items/:id/availability',
  requireAuth,
  requireRole('OWNER', 'STAFF'),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          message: 'Authentication required',
        });
      }

      const { isAvailable } = availabilitySchema.parse(req.body);

      const item = await updateMenuItemAvailability(
        req.user.restaurantId,
        req.params.id,
        isAvailable,
      );

      return res.json(item);
    } catch (error) {
      console.error('Update availability error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Invalid availability data',
          errors: error.issues,
        });
      }

      return res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update availability',
      });
    }
  },
);

export default router;