import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

const validatePasswordUpdate = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long'),
];

// Helper to check validation errors
const checkValidationErrors = (req: Request) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(400, errors.array()[0].msg);
  }
};

// Register
router.post(
  '/register',
  authRateLimiter,
  validateRegistration,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const result = await authService.register(req.body);
    res.status(201).json(result);
  })
);

// Login
router.post(
  '/login',
  authRateLimiter,
  validateLogin,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);
    const result = await authService.login(req.body);
    res.json(result);
  })
);

// Get current user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    const user = await authService.getCurrentUser(req.user.userId);
    res.json(user);
  })
);

// Update password
router.put(
  '/password',
  authenticate,
  validatePasswordUpdate,
  asyncHandler(async (req: Request, res: Response) => {
    checkValidationErrors(req);
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }
    const result = await authService.updatePassword(
      req.user.userId,
      req.body.currentPassword,
      req.body.newPassword
    );
    res.json(result);
  })
);

// Verify token
router.post(
  '/verify',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;
    if (!token) {
      throw new AppError(400, 'Token is required');
    }
    const payload = await authService.verifyToken(token);
    res.json({ valid: true, payload });
  })
);

export default router;
