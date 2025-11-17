import * as cheerio from 'cheerio';

export interface SeoData {
  title?: string;
  metaDescription?: string;
  h1: string[];
  h2: string[];
  h3: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  hasAnalytics: boolean;
  analyticsTools: string[];
  wordCount: number;
  imageCount: number;
  imagesWithAlt: number;
  internalLinks: number;
  externalLinks: number;
  structuredData: any[];
}

export class SeoExtractorService {
  extract(html: string, url: string): SeoData {
    const $ = cheerio.load(html);
    const baseUrl = new URL(url);

    return {
      // Title
      title: this.extractTitle($),

      // Meta description
      metaDescription: this.extractMetaDescription($),

      // Headings
      h1: this.extractHeadings($, 'h1'),
      h2: this.extractHeadings($, 'h2'),
      h3: this.extractHeadings($, 'h3'),

      // Canonical URL
      canonicalUrl: this.extractCanonical($),

      // Open Graph
      ogTitle: this.extractMetaProperty($, 'og:title'),
      ogDescription: this.extractMetaProperty($, 'og:description'),
      ogImage: this.extractMetaProperty($, 'og:image'),
      ogType: this.extractMetaProperty($, 'og:type'),

      // Twitter Card
      twitterCard: this.extractMetaName($, 'twitter:card'),
      twitterTitle: this.extractMetaName($, 'twitter:title'),
      twitterDescription: this.extractMetaName($, 'twitter:description'),
      twitterImage: this.extractMetaName($, 'twitter:image'),

      // Analytics
      hasAnalytics: this.detectAnalytics(html).length > 0,
      analyticsTools: this.detectAnalytics(html),

      // Content metrics
      wordCount: this.countWords($),
      imageCount: this.countImages($),
      imagesWithAlt: this.countImagesWithAlt($),
      internalLinks: this.countInternalLinks($, baseUrl.hostname),
      externalLinks: this.countExternalLinks($, baseUrl.hostname),

      // Structured data
      structuredData: this.extractStructuredData($),
    };
  }

  private extractTitle($: cheerio.CheerioAPI): string | undefined {
    return $('title').first().text().trim() || undefined;
  }

  private extractMetaDescription($: cheerio.CheerioAPI): string | undefined {
    return $('meta[name="description"]').attr('content')?.trim() || undefined;
  }

  private extractHeadings($: cheerio.CheerioAPI, tag: string): string[] {
    const headings: string[] = [];
    $(tag).each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        headings.push(text);
      }
    });
    return headings;
  }

  private extractCanonical($: cheerio.CheerioAPI): string | undefined {
    return $('link[rel="canonical"]').attr('href') || undefined;
  }

  private extractMetaProperty($: cheerio.CheerioAPI, property: string): string | undefined {
    return $(`meta[property="${property}"]`).attr('content')?.trim() || undefined;
  }

  private extractMetaName($: cheerio.CheerioAPI, name: string): string | undefined {
    return $(`meta[name="${name}"]`).attr('content')?.trim() || undefined;
  }

  private detectAnalytics(html: string): string[] {
    const tools: string[] = [];

    // Google Analytics 4
    if (html.includes('gtag') || html.includes('G-')) {
      tools.push('GA4');
    }

    // Google Tag Manager
    if (html.includes('googletagmanager.com/gtm.js')) {
      tools.push('GTM');
    }

    // Facebook Pixel
    if (html.includes('facebook.net/en_US/fbevents.js') || html.includes('fbq(')) {
      tools.push('Facebook Pixel');
    }

    // Hotjar
    if (html.includes('hotjar.com')) {
      tools.push('Hotjar');
    }

    // Mixpanel
    if (html.includes('mixpanel.com')) {
      tools.push('Mixpanel');
    }

    // Amplitude
    if (html.includes('amplitude.com')) {
      tools.push('Amplitude');
    }

    return tools;
  }

  private countWords($: cheerio.CheerioAPI): number {
    // Remove script and style elements
    $('script, style, noscript').remove();

    const text = $('body').text();
    const words = text.split(/\s+/).filter(word => word.length > 0);
    return words.length;
  }

  private countImages($: cheerio.CheerioAPI): number {
    return $('img').length;
  }

  private countImagesWithAlt($: cheerio.CheerioAPI): number {
    return $('img[alt]').filter((_, el) => {
      const alt = $(el).attr('alt');
      return alt && alt.trim().length > 0;
    }).length;
  }

  private countInternalLinks($: cheerio.CheerioAPI, hostname: string): number {
    let count = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && this.isInternalLink(href, hostname)) {
        count++;
      }
    });
    return count;
  }

  private countExternalLinks($: cheerio.CheerioAPI, hostname: string): number {
    let count = 0;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !this.isInternalLink(href, hostname)) {
        count++;
      }
    });
    return count;
  }

  private isInternalLink(href: string, hostname: string): boolean {
    // Relative URLs are internal
    if (href.startsWith('/') || href.startsWith('#') || href.startsWith('?')) {
      return true;
    }

    // Check if the URL hostname matches
    try {
      const url = new URL(href);
      return url.hostname === hostname || url.hostname === `www.${hostname}` || `www.${url.hostname}` === hostname;
    } catch {
      // If URL parsing fails, assume it's internal
      return true;
    }
  }

  private extractStructuredData($: cheerio.CheerioAPI): any[] {
    const data: any[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const json = JSON.parse($(el).html() || '');
        data.push(json);
      } catch (error) {
        // Ignore parsing errors
      }
    });

    return data;
  }

  extractLinks($: cheerio.CheerioAPI, baseUrl: string): Array<{
    url: string;
    anchorText: string;
    rel?: string;
    isExternal: boolean;
    isNoFollow: boolean;
  }> {
    const links: Array<{
      url: string;
      anchorText: string;
      rel?: string;
      isExternal: boolean;
      isNoFollow: boolean;
    }> = [];

    const baseUrlObj = new URL(baseUrl);

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;

      try {
        const absoluteUrl = new URL(href, baseUrl).href;
        const rel = $(el).attr('rel');
        const isNoFollow = rel?.includes('nofollow') || false;
        const isExternal = !this.isInternalLink(href, baseUrlObj.hostname);
        const anchorText = $(el).text().trim();

        links.push({
          url: absoluteUrl,
          anchorText,
          rel,
          isExternal,
          isNoFollow,
        });
      } catch (error) {
        // Skip invalid URLs
      }
    });

    return links;
  }
}

export const seoExtractorService = new SeoExtractorService();
