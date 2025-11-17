import axios from 'axios';
import { chromium, Browser, Page as PlaywrightPage } from 'playwright';
import * as cheerio from 'cheerio';
import { URL } from 'url';
import { prisma } from '../server';
import { seoExtractorService } from './seo-extractor.service';
import { issueDetectorService } from './issue-detector.service';
import { logger } from '../utils/logger';
import { CrawlStatus } from '@prisma/client';

export interface CrawlConfig {
  startUrl: string;
  maxDepth?: number;
  delay?: number;
  followExternal?: boolean;
  jsRendering?: boolean;
  maxUrls?: number;
  userId?: string;
}

interface CrawlState {
  visited: Set<string>;
  queue: Array<{ url: string; depth: number }>;
  crawlId: string;
  browser?: Browser;
  config: CrawlConfig;
  totalUrls: number;
}

export class CrawlerService {
  private activeCrawls: Map<string, CrawlState> = new Map();
  private readonly MAX_CONCURRENT_REQUESTS = 5;

  async startCrawl(config: CrawlConfig): Promise<string> {
    // Create crawl record
    const crawl = await prisma.crawl.create({
      data: {
        startUrl: config.startUrl,
        maxDepth: config.maxDepth || 3,
        delay: config.delay || 1000,
        followExternal: config.followExternal || false,
        jsRendering: config.jsRendering || false,
        maxUrls: config.maxUrls || 10000,
        userId: config.userId,
        status: CrawlStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    logger.info(`Starting crawl ${crawl.id} for ${config.startUrl}`);

    // Initialize crawl state
    const state: CrawlState = {
      visited: new Set(),
      queue: [{ url: config.startUrl, depth: 0 }],
      crawlId: crawl.id,
      config,
      totalUrls: 0,
    };

    this.activeCrawls.set(crawl.id, state);

    // Start crawling (non-blocking)
    this.processCrawl(state).catch(async (error) => {
      logger.error(`Crawl ${crawl.id} failed:`, error);
      await this.updateCrawlStatus(crawl.id, CrawlStatus.FAILED);
    });

    return crawl.id;
  }

  async stopCrawl(crawlId: string): Promise<void> {
    const state = this.activeCrawls.get(crawlId);
    if (!state) {
      return;
    }

    // Close browser if open
    if (state.browser) {
      await state.browser.close();
    }

    // Update status
    await this.updateCrawlStatus(crawlId, CrawlStatus.CANCELLED);

    // Remove from active crawls
    this.activeCrawls.delete(crawlId);

    logger.info(`Crawl ${crawlId} stopped`);
  }

  async getCrawlStatus(crawlId: string) {
    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
      include: {
        _count: {
          select: {
            pages: true,
            links: true,
            issues: true,
          },
        },
      },
    });

    return crawl;
  }

  private async processCrawl(state: CrawlState): Promise<void> {
    const { config, crawlId } = state;

    // Initialize browser for JS rendering
    if (config.jsRendering) {
      state.browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }

    try {
      while (state.queue.length > 0 && state.totalUrls < (config.maxUrls || 10000)) {
        const batch = state.queue.splice(0, this.MAX_CONCURRENT_REQUESTS);

        await Promise.all(
          batch.map(item => this.crawlUrl(state, item.url, item.depth))
        );

        // Update progress
        const progress = (state.totalUrls / (config.maxUrls || 10000)) * 100;
        await prisma.crawl.update({
          where: { id: crawlId },
          data: {
            progress: Math.min(progress, 100),
            urlsCrawled: state.totalUrls,
            totalUrls: state.visited.size,
          },
        });

        // Delay between batches
        if (state.queue.length > 0) {
          await this.sleep(config.delay || 1000);
        }
      }

      // Crawl completed successfully
      await this.updateCrawlStatus(crawlId, CrawlStatus.COMPLETED);
      logger.info(`Crawl ${crawlId} completed. Crawled ${state.totalUrls} URLs`);
    } finally {
      // Cleanup
      if (state.browser) {
        await state.browser.close();
      }
      this.activeCrawls.delete(crawlId);
    }
  }

  private async crawlUrl(state: CrawlState, url: string, depth: number): Promise<void> {
    // Skip if already visited
    if (state.visited.has(url)) {
      return;
    }

    state.visited.add(url);
    state.totalUrls++;

    try {
      logger.debug(`Crawling: ${url} (depth: ${depth})`);

      let html: string;
      let statusCode: number;
      let contentType: string | undefined;

      if (state.config.jsRendering && state.browser) {
        // Use Playwright for JS rendering
        const result = await this.fetchWithPlaywright(state.browser, url);
        html = result.html;
        statusCode = result.statusCode;
        contentType = result.contentType;
      } else {
        // Use axios for static HTML
        const result = await this.fetchWithAxios(url);
        html = result.html;
        statusCode = result.statusCode;
        contentType = result.contentType;
      }

      // Extract SEO data
      const seoData = seoExtractorService.extract(html, url);

      // Save page data
      const page = await prisma.page.create({
        data: {
          crawlId: state.crawlId,
          url,
          statusCode,
          contentType,
          depth,
          ...seoData,
        },
      });

      // Extract and save links
      const $ = cheerio.load(html);
      const links = seoExtractorService.extractLinks($, url);

      for (const link of links) {
        // Save link relationship
        await prisma.link.create({
          data: {
            crawlId: state.crawlId,
            sourcePageId: page.id,
            targetUrl: link.url,
            anchorText: link.anchorText,
            rel: link.rel,
            isExternal: link.isExternal,
            isNoFollow: link.isNoFollow,
          },
        });

        // Add to queue if internal and within depth limit
        if (!link.isExternal && depth < (state.config.maxDepth || 3)) {
          const shouldFollow = this.shouldFollowLink(link.url, url, state.config);
          if (shouldFollow && !state.visited.has(link.url)) {
            state.queue.push({ url: link.url, depth: depth + 1 });
          }
        } else if (link.isExternal && state.config.followExternal && depth < (state.config.maxDepth || 3)) {
          // Follow external links if configured
          if (!state.visited.has(link.url)) {
            state.queue.push({ url: link.url, depth: depth + 1 });
          }
        }
      }

      // Detect and save issues
      const issues = issueDetectorService.detectIssues(seoData, url, statusCode);
      for (const issue of issues) {
        await prisma.issue.create({
          data: {
            crawlId: state.crawlId,
            pageId: page.id,
            ...issue,
          },
        });
      }
    } catch (error: any) {
      logger.error(`Error crawling ${url}:`, error.message);

      // Save failed page
      await prisma.page.create({
        data: {
          crawlId: state.crawlId,
          url,
          statusCode: error.response?.status || 0,
          depth,
        },
      });
    }
  }

  private async fetchWithAxios(url: string): Promise<{ html: string; statusCode: number; contentType?: string }> {
    const response = await axios.get(url, {
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LibreCrawl/2.0; +https://github.com/librecrawl)',
      },
    });

    return {
      html: response.data,
      statusCode: response.status,
      contentType: response.headers['content-type'],
    };
  }

  private async fetchWithPlaywright(browser: Browser, url: string): Promise<{ html: string; statusCode: number; contentType?: string }> {
    const page = await browser.newPage();

    try {
      const response = await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      const html = await page.content();

      return {
        html,
        statusCode: response?.status() || 0,
        contentType: response?.headers()['content-type'],
      };
    } finally {
      await page.close();
    }
  }

  private shouldFollowLink(targetUrl: string, sourceUrl: string, config: CrawlConfig): boolean {
    try {
      const target = new URL(targetUrl);
      const source = new URL(sourceUrl);

      // Skip non-http(s) protocols
      if (!target.protocol.startsWith('http')) {
        return false;
      }

      // Skip common exclusions
      const exclusions = [
        '/wp-admin',
        '/admin',
        '/login',
        '/logout',
        '/cart',
        '/checkout',
        '/account',
        '.pdf',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.zip',
        '.xml',
      ];

      for (const exclusion of exclusions) {
        if (target.pathname.toLowerCase().includes(exclusion)) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async updateCrawlStatus(crawlId: string, status: CrawlStatus): Promise<void> {
    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status,
        ...(status === CrawlStatus.COMPLETED || status === CrawlStatus.FAILED || status === CrawlStatus.CANCELLED
          ? { completedAt: new Date() }
          : {}),
      },
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const crawlerService = new CrawlerService();
