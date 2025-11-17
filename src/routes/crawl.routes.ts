import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { crawlerService } from '../services/crawler.service';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, optionalAuth } from '../middleware/auth';
import { prisma } from '../server';

const router = Router();

// Validation
const validateCrawlStart = [
  body('startUrl').isURL().withMessage('Invalid URL'),
  body('maxDepth').optional().isInt({ min: 1, max: 10 }).withMessage('Max depth must be between 1 and 10'),
  body('delay').optional().isInt({ min: 0, max: 10000 }).withMessage('Delay must be between 0 and 10000ms'),
  body('followExternal').optional().isBoolean(),
  body('jsRendering').optional().isBoolean(),
  body('maxUrls').optional().isInt({ min: 1, max: 100000 }),
];

// Start a new crawl
router.post(
  '/start',
  optionalAuth,
  validateCrawlStart,
  asyncHandler(async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, errors.array()[0].msg);
    }

    const { startUrl, maxDepth, delay, followExternal, jsRendering, maxUrls } = req.body;

    // Check tier limits
    const userId = req.user?.userId;
    const tier = req.user?.tier || 'GUEST';

    if (!userId && tier === 'GUEST') {
      // Check guest crawl limits (3 per 24 hours)
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const recentCrawls = await prisma.crawlHistory.count({
        where: {
          ipAddress,
          createdAt: { gte: dayAgo },
        },
      });

      if (recentCrawls >= 3 && process.env.LOCAL_MODE !== 'true') {
        throw new AppError(429, 'Guest users are limited to 3 crawls per 24 hours. Please register for unlimited crawls.');
      }

      // Record crawl history
      await prisma.crawlHistory.create({
        data: {
          ipAddress,
          userAgent: req.get('user-agent'),
          crawlId: 'pending',
        },
      });
    }

    // Start crawl
    const crawlId = await crawlerService.startCrawl({
      startUrl,
      maxDepth,
      delay,
      followExternal,
      jsRendering,
      maxUrls,
      userId,
    });

    res.status(201).json({
      crawlId,
      message: 'Crawl started successfully',
    });
  })
);

// Get crawl status
router.get(
  '/:crawlId',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const crawl = await crawlerService.getCrawlStatus(crawlId);

    if (!crawl) {
      throw new AppError(404, 'Crawl not found');
    }

    res.json(crawl);
  })
);

// Stop a crawl
router.post(
  '/:crawlId/stop',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
    });

    if (!crawl) {
      throw new AppError(404, 'Crawl not found');
    }

    // Check ownership
    if (crawl.userId !== req.user?.userId && req.user?.tier !== 'ADMIN') {
      throw new AppError(403, 'You do not have permission to stop this crawl');
    }

    await crawlerService.stopCrawl(crawlId);

    res.json({ message: 'Crawl stopped successfully' });
  })
);

// Get crawl pages
router.get(
  '/:crawlId/pages',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where: { crawlId },
        orderBy: { crawledAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.page.count({
        where: { crawlId },
      }),
    ]);

    res.json({
      pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get crawl links
router.get(
  '/:crawlId/links',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where: { crawlId },
        include: {
          sourcePage: {
            select: { url: true },
          },
          targetPage: {
            select: { url: true },
          },
        },
        skip,
        take: limit,
      }),
      prisma.link.count({
        where: { crawlId },
      }),
    ]);

    res.json({
      links,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

// Get crawl issues
router.get(
  '/:crawlId/issues',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;
    const severity = req.query.severity as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = { crawlId };
    if (severity) {
      where.severity = severity;
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          page: {
            select: { url: true },
          },
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.issue.count({ where }),
    ]);

    res.json({
      issues,
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
