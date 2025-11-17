import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../server';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get user settings
router.get(
  '/settings',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.userId },
    });

    if (!settings) {
      // Create default settings if they don't exist
      const newSettings = await prisma.userSettings.create({
        data: { userId: req.user.userId },
      });
      res.json(newSettings);
      return;
    }

    res.json(settings);
  })
);

// Update user settings
router.put(
  '/settings',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { defaultDelay, defaultDepth, followExternal, jsRendering, theme, customCss } = req.body;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.userId },
      update: {
        ...(defaultDelay !== undefined && { defaultDelay }),
        ...(defaultDepth !== undefined && { defaultDepth }),
        ...(followExternal !== undefined && { followExternal }),
        ...(jsRendering !== undefined && { jsRendering }),
        ...(theme !== undefined && { theme }),
        ...(customCss !== undefined && { customCss }),
      },
      create: {
        userId: req.user.userId,
        defaultDelay,
        defaultDepth,
        followExternal,
        jsRendering,
        theme,
        customCss,
      },
    });

    res.json(settings);
  })
);

// Get user crawl history
router.get(
  '/crawls',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [crawls, total] = await Promise.all([
      prisma.crawl.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          startUrl: true,
          status: true,
          progress: true,
          urlsCrawled: true,
          totalUrls: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
        },
      }),
      prisma.crawl.count({
        where: { userId: req.user.userId },
      }),
    ]);

    res.json({
      crawls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

export default router;
