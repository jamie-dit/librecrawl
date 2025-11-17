import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from '@tanstack/react-table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  ArrowLeft,
  StopCircle,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Link as LinkIcon,
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { crawlApi, exportApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

// Types
interface CrawlStatus {
  _id: string;
  startUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    pagesFound: number;
    pagesCrawled: number;
  };
  stats: {
    totalUrls: number;
    crawledUrls: number;
    issuesFound: number;
    completionTime?: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PageData {
  _id: string;
  url: string;
  statusCode: number;
  title: string;
  metaDescription: string;
  wordCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
}

interface LinkData {
  _id: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  isExternal: boolean;
  isNofollow: boolean;
}

interface IssueData {
  _id: string;
  pageUrl: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  recommendation: string;
}

export default function CrawlResultsPage() {
  const { crawlId } = useParams<{ crawlId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [pageSearch, setPageSearch] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [issueSeverityFilter, setIssueSeverityFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch crawl status
  const { data: crawlData, isLoading: crawlLoading } = useQuery({
    queryKey: ['crawl-status', crawlId],
    queryFn: async () => {
      const response = await crawlApi.getStatus(crawlId!);
      return response.data as CrawlStatus;
    },
    refetchInterval: (data) => {
      return data?.status === 'running' ? 5000 : false;
    },
  });

  // Fetch pages
  const [pagesPage, setPagesPage] = useState(1);
  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['crawl-pages', crawlId, pagesPage],
    queryFn: async () => {
      const response = await crawlApi.getPages(crawlId!, pagesPage, 50);
      return response.data as { pages: PageData[]; total: number };
    },
    enabled: !!crawlId,
  });

  // Fetch links
  const [linksPage, setLinksPage] = useState(1);
  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['crawl-links', crawlId, linksPage],
    queryFn: async () => {
      const response = await crawlApi.getLinks(crawlId!, linksPage, 50);
      return response.data as { links: LinkData[]; total: number };
    },
    enabled: !!crawlId,
  });

  // Fetch issues
  const [issuesPage, setIssuesPage] = useState(1);
  const { data: issuesData, isLoading: issuesLoading } = useQuery({
    queryKey: ['crawl-issues', crawlId, issueSeverityFilter === 'all' ? undefined : issueSeverityFilter, issuesPage],
    queryFn: async () => {
      const response = await crawlApi.getIssues(
        crawlId!,
        issueSeverityFilter === 'all' ? undefined : issueSeverityFilter,
        issuesPage,
        50
      );
      return response.data as { issues: IssueData[]; total: number; bySeverity: Record<string, number> };
    },
    enabled: !!crawlId,
  });

  // Stop crawl handler
  const handleStopCrawl = async () => {
    try {
      await crawlApi.stop(crawlId!);
      toast({
        title: 'Crawl stopped',
        description: 'The crawl has been stopped successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to stop crawl',
        description: error.response?.data?.error || 'An unexpected error occurred',
        variant: 'destructive',
      });
    }
  };

  // Export handlers
  const handleExport = async (type: 'pages' | 'links' | 'issues', format: 'csv' | 'json' | 'xml') => {
    setIsExporting(true);
    try {
      let response;
      if (type === 'pages') {
        response = await exportApi.exportPages(crawlId!, format);
      } else if (type === 'links') {
        response = await exportApi.exportLinks(crawlId!);
      } else {
        response = await exportApi.exportIssues(crawlId!);
      }

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `crawl-${crawlId}-${type}.${format === 'csv' ? 'csv' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast({
        title: 'Export successful',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully.`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.response?.data?.error || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'running':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get status code color
  const getStatusCodeColor = (code: number) => {
    if (code >= 200 && code < 300) return 'bg-green-500';
    if (code >= 300 && code < 400) return 'bg-blue-500';
    if (code >= 400 && code < 500) return 'bg-orange-500';
    if (code >= 500) return 'bg-red-500';
    return 'bg-gray-500';
  };

  // Calculate progress percentage
  const progress = crawlData?.progress.pagesFound
    ? (crawlData.progress.pagesCrawled / crawlData.progress.pagesFound) * 100
    : 0;

  // Prepare chart data for issues by severity
  const issuesBySeverityChartData = issuesData?.bySeverity
    ? Object.entries(issuesData.bySeverity).map(([severity, count]) => ({
        severity: severity.charAt(0).toUpperCase() + severity.slice(1),
        count,
      }))
    : [];

  // Filter pages by search
  const filteredPages = useMemo(() => {
    if (!pagesData?.pages) return [];
    if (!pageSearch) return pagesData.pages;
    return pagesData.pages.filter((page) =>
      page.url.toLowerCase().includes(pageSearch.toLowerCase())
    );
  }, [pagesData?.pages, pageSearch]);

  // Filter links by search
  const filteredLinks = useMemo(() => {
    if (!linksData?.links) return [];
    if (!linkSearch) return linksData.links;
    return linksData.links.filter(
      (link) =>
        link.sourceUrl.toLowerCase().includes(linkSearch.toLowerCase()) ||
        link.targetUrl.toLowerCase().includes(linkSearch.toLowerCase())
    );
  }, [linksData?.links, linkSearch]);

  // Pages table columns
  const pagesColumns: ColumnDef<PageData>[] = [
    {
      accessorKey: 'url',
      header: 'URL',
      cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.original.url}>
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <span className="truncate">{row.original.url}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      ),
    },
    {
      accessorKey: 'statusCode',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={`${getStatusCodeColor(row.original.statusCode)} text-white`}>
          {row.original.statusCode}
        </Badge>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.title}>
          {row.original.title || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'metaDescription',
      header: 'Meta Description',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.metaDescription}>
          {row.original.metaDescription || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'wordCount',
      header: 'Words',
    },
    {
      header: 'Images',
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="text-green-600">{row.original.imagesWithAlt}</span> /{' '}
          <span className="text-red-600">{row.original.imagesWithoutAlt}</span>
        </div>
      ),
    },
    {
      header: 'Links',
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="text-blue-600">{row.original.internalLinks}</span> /{' '}
          <span className="text-purple-600">{row.original.externalLinks}</span>
        </div>
      ),
    },
  ];

  // Links table columns
  const linksColumns: ColumnDef<LinkData>[] = [
    {
      accessorKey: 'sourceUrl',
      header: 'Source URL',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.sourceUrl}>
          {row.original.sourceUrl}
        </div>
      ),
    },
    {
      accessorKey: 'targetUrl',
      header: 'Target URL',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.targetUrl}>
          <a
            href={row.original.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <span className="truncate">{row.original.targetUrl}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
        </div>
      ),
    },
    {
      accessorKey: 'anchorText',
      header: 'Anchor Text',
      cell: ({ row }) => row.original.anchorText || '-',
    },
    {
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Badge variant={row.original.isExternal ? 'default' : 'secondary'}>
            {row.original.isExternal ? 'External' : 'Internal'}
          </Badge>
          {row.original.isNofollow && <Badge variant="outline">NoFollow</Badge>}
        </div>
      ),
    },
  ];

  // Issues table columns
  const issuesColumns: ColumnDef<IssueData>[] = [
    {
      accessorKey: 'pageUrl',
      header: 'Page URL',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.pageUrl}>
          {row.original.pageUrl}
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
    },
    {
      accessorKey: 'severity',
      header: 'Severity',
      cell: ({ row }) => (
        <Badge className={`${getSeverityColor(row.original.severity)} text-white`}>
          {row.original.severity.charAt(0).toUpperCase() + row.original.severity.slice(1)}
        </Badge>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.title}>
          {row.original.title}
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.original.description}>
          {row.original.description}
        </div>
      ),
    },
    {
      accessorKey: 'recommendation',
      header: 'Recommendation',
      cell: ({ row }) => (
        <div className="max-w-md truncate" title={row.original.recommendation}>
          {row.original.recommendation}
        </div>
      ),
    },
  ];

  // Loading state
  if (crawlLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            {crawlData?.status === 'running' && (
              <Button
                variant="destructive"
                onClick={handleStopCrawl}
                className="flex items-center gap-2"
              >
                <StopCircle className="h-4 w-4" />
                Stop Crawl
              </Button>
            )}
          </div>

          <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2 flex items-center gap-3">
                    <Globe className="h-8 w-8 text-blue-600" />
                    {crawlData?.startUrl}
                  </CardTitle>
                  <CardDescription className="text-base">
                    Started {crawlData?.createdAt && formatDistanceToNow(new Date(crawlData.createdAt), { addSuffix: true })}
                  </CardDescription>
                </div>
                <Badge className={`${getStatusColor(crawlData?.status || 'pending')} text-white text-lg px-4 py-2`}>
                  {crawlData?.status?.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Bar */}
              {crawlData?.status === 'running' && (
                <div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                    <span>Crawl Progress</span>
                    <span>
                      {crawlData.progress.pagesCrawled} / {crawlData.progress.pagesFound} pages
                    </span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {crawlData?.stats.crawledUrls || 0}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">URLs Crawled</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {crawlData?.stats.totalUrls || 0}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-400">Total URLs</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                      {crawlData?.stats.issuesFound || 0}
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-400">Issues Found</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {crawlData?.stats.completionTime
                        ? `${(crawlData.stats.completionTime / 1000).toFixed(1)}s`
                        : '-'}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">Completion Time</div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="space-y-6">
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Issues by Severity Chart */}
              <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    Issues by Severity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {issuesBySeverityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={issuesBySeverityChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="severity" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#f97316" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No issues data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Crawl Progress Chart */}
              <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Crawl Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={[
                        { time: 'Start', pages: 0 },
                        { time: 'Current', pages: crawlData?.progress.pagesCrawled || 0 },
                        {
                          time: 'Target',
                          pages: crawlData?.progress.pagesFound || 0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="pages" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Issues */}
            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Top Issues
                </CardTitle>
                <CardDescription>Most critical issues found during the crawl</CardDescription>
              </CardHeader>
              <CardContent>
                {issuesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : issuesData?.issues && issuesData.issues.length > 0 ? (
                  <div className="space-y-4">
                    {issuesData.issues.slice(0, 5).map((issue) => (
                      <div
                        key={issue._id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getSeverityColor(issue.severity)} text-white`}>
                                {issue.severity.toUpperCase()}
                              </Badge>
                              <span className="font-semibold">{issue.title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{issue.description}</p>
                            <p className="text-xs text-blue-600">{issue.pageUrl}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No issues found!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Pages */}
          <TabsContent value="pages" className="space-y-6">
            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Crawled Pages
                    </CardTitle>
                    <CardDescription>All pages discovered during the crawl</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('pages', 'csv')}>
                        Export as CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pages', 'json')}>
                        Export as JSON
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pages', 'xml')}>
                        Export as XML
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by URL..."
                    value={pageSearch}
                    onChange={(e) => setPageSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Table */}
                {pagesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredPages.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {pagesColumns.map((column) => (
                              <TableHead key={column.accessorKey as string || 'action'}>
                                {column.header as string}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPages.map((page) => (
                            <TableRow key={page._id}>
                              {pagesColumns.map((column) => (
                                <TableCell key={column.accessorKey as string || 'action'}>
                                  {column.cell ? column.cell({ row: { original: page } } as any) : null}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((pagesPage - 1) * 50) + 1} to {Math.min(pagesPage * 50, pagesData?.total || 0)} of {pagesData?.total || 0} pages
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagesPage((p) => Math.max(1, p - 1))}
                          disabled={pagesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPagesPage((p) => p + 1)}
                          disabled={!pagesData?.total || pagesPage * 50 >= pagesData.total}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No pages found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Links */}
          <TabsContent value="links" className="space-y-6">
            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="h-5 w-5 text-purple-600" />
                      Discovered Links
                    </CardTitle>
                    <CardDescription>All links found during the crawl</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('links', 'csv')}>
                        Export as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by source or target URL..."
                    value={linkSearch}
                    onChange={(e) => setLinkSearch(e.target.value)}
                    className="max-w-sm"
                  />
                </div>

                {/* Table */}
                {linksLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : filteredLinks.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {linksColumns.map((column) => (
                              <TableHead key={column.accessorKey as string || 'action'}>
                                {column.header as string}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLinks.map((link) => (
                            <TableRow key={link._id}>
                              {linksColumns.map((column) => (
                                <TableCell key={column.accessorKey as string || 'action'}>
                                  {column.cell ? column.cell({ row: { original: link } } as any) : null}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((linksPage - 1) * 50) + 1} to {Math.min(linksPage * 50, linksData?.total || 0)} of {linksData?.total || 0} links
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLinksPage((p) => Math.max(1, p - 1))}
                          disabled={linksPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLinksPage((p) => p + 1)}
                          disabled={!linksData?.total || linksPage * 50 >= linksData.total}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No links found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Issues */}
          <TabsContent value="issues" className="space-y-6">
            {/* Issue Count Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {issuesData?.bySeverity?.critical || 0}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-400">Critical</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {issuesData?.bySeverity?.high || 0}
                  </div>
                  <div className="text-sm text-orange-600 dark:text-orange-400">High</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900 border-yellow-200 dark:border-yellow-800">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {issuesData?.bySeverity?.medium || 0}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">Medium</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {issuesData?.bySeverity?.low || 0}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Low</div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Issues
                    </CardTitle>
                    <CardDescription>Problems and recommendations for improvement</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" disabled={isExporting}>
                        {isExporting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleExport('issues', 'csv')}>
                        Export as CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Severity Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Filter by severity:</span>
                  <Select value={issueSeverityFilter} onValueChange={setIssueSeverityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Table */}
                {issuesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : issuesData?.issues && issuesData.issues.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {issuesColumns.map((column) => (
                              <TableHead key={column.accessorKey as string || 'action'}>
                                {column.header as string}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {issuesData.issues.map((issue) => (
                            <TableRow key={issue._id}>
                              {issuesColumns.map((column) => (
                                <TableCell key={column.accessorKey as string || 'action'}>
                                  {column.cell ? column.cell({ row: { original: issue } } as any) : null}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((issuesPage - 1) * 50) + 1} to {Math.min(issuesPage * 50, issuesData?.total || 0)} of {issuesData?.total || 0} issues
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIssuesPage((p) => Math.max(1, p - 1))}
                          disabled={issuesPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIssuesPage((p) => p + 1)}
                          disabled={!issuesData?.total || issuesPage * 50 >= issuesData.total}
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>No issues found!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
