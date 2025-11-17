import { Router, Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { prisma } from '../server';
import { Parser } from 'json2csv';
import { Builder } from 'xml2js';

const router = Router();

// Export pages as CSV
router.get(
  '/:crawlId/pages/csv',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const pages = await prisma.page.findMany({
      where: { crawlId },
    });

    if (pages.length === 0) {
      throw new AppError(404, 'No pages found for this crawl');
    }

    const fields = [
      'url',
      'statusCode',
      'title',
      'metaDescription',
      'h1',
      'canonicalUrl',
      'wordCount',
      'imageCount',
      'imagesWithAlt',
      'internalLinks',
      'externalLinks',
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(pages);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="pages-${crawlId}.csv"`);
    res.send(csv);
  })
);

// Export pages as JSON
router.get(
  '/:crawlId/pages/json',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const pages = await prisma.page.findMany({
      where: { crawlId },
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="pages-${crawlId}.json"`);
    res.json(pages);
  })
);

// Export pages as XML
router.get(
  '/:crawlId/pages/xml',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const pages = await prisma.page.findMany({
      where: { crawlId },
    });

    const builder = new Builder();
    const xml = builder.buildObject({ pages: { page: pages } });

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="pages-${crawlId}.xml"`);
    res.send(xml);
  })
);

// Export links as CSV
router.get(
  '/:crawlId/links/csv',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const links = await prisma.link.findMany({
      where: { crawlId },
      include: {
        sourcePage: { select: { url: true } },
        targetPage: { select: { url: true } },
      },
    });

    if (links.length === 0) {
      throw new AppError(404, 'No links found for this crawl');
    }

    const data = links.map(link => ({
      sourceUrl: link.sourcePage.url,
      targetUrl: link.targetPage?.url || link.targetUrl,
      anchorText: link.anchorText,
      isExternal: link.isExternal,
      isNoFollow: link.isNoFollow,
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="links-${crawlId}.csv"`);
    res.send(csv);
  })
);

// Export issues as CSV
router.get(
  '/:crawlId/issues/csv',
  asyncHandler(async (req: Request, res: Response) => {
    const { crawlId } = req.params;

    const issues = await prisma.issue.findMany({
      where: { crawlId },
      include: {
        page: { select: { url: true } },
      },
    });

    if (issues.length === 0) {
      throw new AppError(404, 'No issues found for this crawl');
    }

    const data = issues.map(issue => ({
      url: issue.page?.url || 'N/A',
      type: issue.type,
      severity: issue.severity,
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="issues-${crawlId}.csv"`);
    res.send(csv);
  })
);

export default router;
