import { IssueType, IssueSeverity } from '@prisma/client';
import { SeoData } from './seo-extractor.service';

interface Issue {
  type: IssueType;
  severity: IssueSeverity;
  title: string;
  description: string;
  recommendation?: string;
}

export class IssueDetectorService {
  detectIssues(seoData: SeoData, url: string, statusCode?: number): Issue[] {
    const issues: Issue[] = [];

    // HTTP status code issues
    if (statusCode) {
      if (statusCode >= 400 && statusCode < 500) {
        issues.push({
          type: IssueType.HTTP_ERROR,
          severity: IssueSeverity.CRITICAL,
          title: `HTTP ${statusCode} Error`,
          description: `Page returned a ${statusCode} error status code`,
          recommendation: 'Fix broken links or restore missing content',
        });
      } else if (statusCode >= 500) {
        issues.push({
          type: IssueType.HTTP_ERROR,
          severity: IssueSeverity.CRITICAL,
          title: `HTTP ${statusCode} Server Error`,
          description: `Server returned a ${statusCode} error`,
          recommendation: 'Check server configuration and fix server errors',
        });
      }
    }

    // Title issues
    if (!seoData.title) {
      issues.push({
        type: IssueType.MISSING_TITLE,
        severity: IssueSeverity.CRITICAL,
        title: 'Missing Title Tag',
        description: 'Page is missing a title tag',
        recommendation: 'Add a descriptive, unique title tag (50-60 characters)',
      });
    } else {
      if (seoData.title.length < 30) {
        issues.push({
          type: IssueType.TITLE_TOO_SHORT,
          severity: IssueSeverity.MEDIUM,
          title: 'Title Too Short',
          description: `Title is only ${seoData.title.length} characters`,
          recommendation: 'Increase title length to 50-60 characters for better SEO',
        });
      } else if (seoData.title.length > 60) {
        issues.push({
          type: IssueType.TITLE_TOO_LONG,
          severity: IssueSeverity.MEDIUM,
          title: 'Title Too Long',
          description: `Title is ${seoData.title.length} characters (may be truncated in search results)`,
          recommendation: 'Reduce title length to 50-60 characters',
        });
      }
    }

    // Meta description issues
    if (!seoData.metaDescription) {
      issues.push({
        type: IssueType.MISSING_META_DESCRIPTION,
        severity: IssueSeverity.HIGH,
        title: 'Missing Meta Description',
        description: 'Page is missing a meta description',
        recommendation: 'Add a compelling meta description (150-160 characters)',
      });
    } else {
      if (seoData.metaDescription.length < 120) {
        issues.push({
          type: IssueType.META_DESCRIPTION_TOO_SHORT,
          severity: IssueSeverity.LOW,
          title: 'Meta Description Too Short',
          description: `Meta description is only ${seoData.metaDescription.length} characters`,
          recommendation: 'Increase to 150-160 characters for better visibility',
        });
      } else if (seoData.metaDescription.length > 160) {
        issues.push({
          type: IssueType.META_DESCRIPTION_TOO_LONG,
          severity: IssueSeverity.LOW,
          title: 'Meta Description Too Long',
          description: `Meta description is ${seoData.metaDescription.length} characters (may be truncated)`,
          recommendation: 'Reduce to 150-160 characters',
        });
      }
    }

    // H1 issues
    if (seoData.h1.length === 0) {
      issues.push({
        type: IssueType.MISSING_H1,
        severity: IssueSeverity.HIGH,
        title: 'Missing H1 Heading',
        description: 'Page is missing an H1 heading',
        recommendation: 'Add a single, descriptive H1 heading',
      });
    } else if (seoData.h1.length > 1) {
      issues.push({
        type: IssueType.MULTIPLE_H1,
        severity: IssueSeverity.MEDIUM,
        title: 'Multiple H1 Headings',
        description: `Page has ${seoData.h1.length} H1 headings`,
        recommendation: 'Use only one H1 heading per page',
      });
    }

    // Image alt text issues
    if (seoData.imageCount > 0) {
      const missingAlt = seoData.imageCount - seoData.imagesWithAlt;
      if (missingAlt > 0) {
        const percentage = Math.round((missingAlt / seoData.imageCount) * 100);
        issues.push({
          type: IssueType.MISSING_ALT_TEXT,
          severity: percentage > 50 ? IssueSeverity.HIGH : IssueSeverity.MEDIUM,
          title: 'Images Missing Alt Text',
          description: `${missingAlt} out of ${seoData.imageCount} images (${percentage}%) are missing alt text`,
          recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
        });
      }
    }

    // Thin content
    if (seoData.wordCount < 300) {
      issues.push({
        type: IssueType.THIN_CONTENT,
        severity: IssueSeverity.MEDIUM,
        title: 'Thin Content',
        description: `Page has only ${seoData.wordCount} words`,
        recommendation: 'Add more quality content (aim for 300+ words)',
      });
    }

    // Missing canonical
    if (!seoData.canonicalUrl) {
      issues.push({
        type: IssueType.MISSING_CANONICAL,
        severity: IssueSeverity.LOW,
        title: 'Missing Canonical URL',
        description: 'Page is missing a canonical URL',
        recommendation: 'Add a canonical tag to prevent duplicate content issues',
      });
    }

    // Missing Open Graph tags
    if (!seoData.ogTitle || !seoData.ogDescription || !seoData.ogImage) {
      issues.push({
        type: IssueType.MISSING_OG_TAGS,
        severity: IssueSeverity.LOW,
        title: 'Incomplete Open Graph Tags',
        description: 'Page is missing some Open Graph meta tags',
        recommendation: 'Add og:title, og:description, og:image, and og:type tags for better social sharing',
      });
    }

    return issues;
  }
}

export const issueDetectorService = new IssueDetectorService();
