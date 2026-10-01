import { Router } from 'express';
import { z } from 'zod';
import { loginUser } from './auth.service.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  try {
    const result = loginSchema.parse(req.body);

    const auth = await loginUser(result.email, result.password);

    res.json(auth);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid login request',
        errors: error.issues,
      });
    }

    return res.status(401).json({
      message: error instanceof Error ? error.message : 'Authentication failed',
    });
  }
});

export default router;

