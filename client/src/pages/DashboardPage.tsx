import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Loader2,
  Globe,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader as LoaderIcon,
  Calendar,
  ExternalLink
} from 'lucide-react';
import { crawlApi, userApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface CrawlFormData {
  startUrl: string;
  maxDepth: number;
  delay: number;
  followExternal: boolean;
  jsRendering: boolean;
  maxUrls: number;
}

interface Crawl {
  _id: string;
  startUrl: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    pagesFound: number;
    pagesCrawled: number;
  };
  createdAt: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxDepth, setMaxDepth] = useState(3);
  const [delay, setDelay] = useState(1000);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CrawlFormData>({
    defaultValues: {
      startUrl: '',
      maxDepth: 3,
      delay: 1000,
      followExternal: false,
      jsRendering: false,
      maxUrls: 1000,
    },
  });

  // Fetch recent crawls
  const { data: crawlsData, isLoading: crawlsLoading } = useQuery({
    queryKey: ['crawls'],
    queryFn: async () => {
      const response = await userApi.getCrawls(1, 6);
      return response.data;
    },
  });

  const followExternal = watch('followExternal');
  const jsRendering = watch('jsRendering');

  const onSubmit = async (data: CrawlFormData) => {
    setIsSubmitting(true);
    try {
      const response = await crawlApi.start({
        startUrl: data.startUrl,
        maxDepth: data.maxDepth,
        delay: data.delay,
        followExternal: data.followExternal,
        jsRendering: data.jsRendering,
        maxUrls: data.maxUrls,
      });

      toast({
        title: 'Crawl started!',
        description: 'Your web crawl has been initiated successfully.',
      });

      // Navigate to results page
      navigate(`/crawl/${response.data.crawlId}`);
    } catch (error: any) {
      toast({
        title: 'Failed to start crawl',
        description: error.response?.data?.error || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'running':
        return <LoaderIcon className="h-4 w-4 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="container mx-auto px-4 py-16 relative">
          <div className="max-w-3xl animate-in fade-in slide-in-from-bottom duration-500">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome to LibreCrawl
            </h1>
            <p className="text-xl text-blue-100">
              Powerful web crawling and SEO analysis at your fingertips. Start crawling websites,
              analyze performance, and optimize your web presence.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crawl Configuration Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95 animate-in fade-in slide-in-from-left duration-500">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Globe className="h-6 w-6 text-blue-600" />
                  Start a New Crawl
                </CardTitle>
                <CardDescription>
                  Configure your web crawl settings and begin analyzing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* URL Input */}
                  <div className="space-y-2">
                    <Label htmlFor="startUrl" className="text-base font-semibold">
                      Target URL *
                    </Label>
                    <Input
                      id="startUrl"
                      type="url"
                      placeholder="https://example.com"
                      {...register('startUrl', {
                        required: 'URL is required',
                        pattern: {
                          value: /^https?:\/\/.+/i,
                          message: 'Please enter a valid URL (http:// or https://)',
                        },
                      })}
                      className={errors.startUrl ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.startUrl && (
                      <p className="text-sm text-red-500">{errors.startUrl.message}</p>
                    )}
                  </div>

                  {/* Max Depth Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxDepth" className="text-base font-semibold">
                        Max Depth
                      </Label>
                      <span className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full">
                        {maxDepth} {maxDepth === 1 ? 'level' : 'levels'}
                      </span>
                    </div>
                    <Slider
                      id="maxDepth"
                      min={1}
                      max={10}
                      step={1}
                      value={[maxDepth]}
                      onValueChange={(value) => {
                        setMaxDepth(value[0]);
                        setValue('maxDepth', value[0]);
                      }}
                      disabled={isSubmitting}
                      className="py-4"
                    />
                    <p className="text-xs text-muted-foreground">
                      How many link levels deep to crawl from the starting URL
                    </p>
                  </div>

                  {/* Delay Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="delay" className="text-base font-semibold">
                        Request Delay
                      </Label>
                      <span className="text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-950 px-3 py-1 rounded-full">
                        {delay}ms
                      </span>
                    </div>
                    <Slider
                      id="delay"
                      min={0}
                      max={5000}
                      step={100}
                      value={[delay]}
                      onValueChange={(value) => {
                        setDelay(value[0]);
                        setValue('delay', value[0]);
                      }}
                      disabled={isSubmitting}
                      className="py-4"
                    />
                    <p className="text-xs text-muted-foreground">
                      Delay between requests to avoid overwhelming the server
                    </p>
                  </div>

                  {/* Max URLs Input */}
                  <div className="space-y-2">
                    <Label htmlFor="maxUrls" className="text-base font-semibold">
                      Max URLs
                    </Label>
                    <Input
                      id="maxUrls"
                      type="number"
                      min={1}
                      max={10000}
                      {...register('maxUrls', {
                        valueAsNumber: true,
                        min: { value: 1, message: 'Must be at least 1' },
                        max: { value: 10000, message: 'Cannot exceed 10,000' },
                      })}
                      className={errors.maxUrls ? 'border-red-500' : ''}
                      disabled={isSubmitting}
                    />
                    {errors.maxUrls && (
                      <p className="text-sm text-red-500">{errors.maxUrls.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Maximum number of pages to crawl
                    </p>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="followExternal" className="text-base font-medium">
                          Follow External Links
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Crawl links pointing to external domains
                        </p>
                      </div>
                      <Switch
                        id="followExternal"
                        checked={followExternal}
                        onCheckedChange={(checked) => setValue('followExternal', checked)}
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="jsRendering" className="text-base font-medium">
                          Enable JavaScript Rendering
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Use headless browser for JS-heavy sites (slower)
                        </p>
                      </div>
                      <Switch
                        id="jsRendering"
                        checked={jsRendering}
                        onCheckedChange={(checked) => setValue('jsRendering', checked)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Starting Crawl...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        Start Crawl
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6 animate-in fade-in slide-in-from-right duration-500">
            <Card className="shadow-xl border-none backdrop-blur-sm bg-gradient-to-br from-blue-600 to-purple-600 text-white">
              <CardHeader>
                <CardTitle className="text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Total Crawls</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {crawlsData?.total || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Completed</span>
                  </div>
                  <span className="text-2xl font-bold">
                    {crawlsData?.crawls?.filter((c: Crawl) => c.status === 'completed').length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Crawls Section */}
        <div className="mt-8">
          <Card className="shadow-xl border-none backdrop-blur-sm bg-background/95 animate-in fade-in slide-in-from-bottom duration-700">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Clock className="h-6 w-6 text-blue-600" />
                Recent Crawls
              </CardTitle>
              <CardDescription>
                Your latest web crawling activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {crawlsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
              ) : crawlsData?.crawls?.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-lg text-muted-foreground">No crawls yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Start your first crawl using the form above
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {crawlsData?.crawls?.map((crawl: Crawl) => {
                    const progress = crawl.progress.pagesFound > 0
                      ? (crawl.progress.pagesCrawled / crawl.progress.pagesFound) * 100
                      : 0;

                    return (
                      <Card
                        key={crawl._id}
                        className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-blue-300 dark:hover:border-blue-700"
                        onClick={() => navigate(`/crawl/${crawl._id}`)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                                {crawl.startUrl}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors flex-shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="secondary"
                              className={`${getStatusColor(crawl.status)} text-white`}
                            >
                              <span className="flex items-center gap-1">
                                {getStatusIcon(crawl.status)}
                                {crawl.status}
                              </span>
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                              <span>Progress</span>
                              <span>
                                {crawl.progress.pagesCrawled} / {crawl.progress.pagesFound} pages
                              </span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(crawl.createdAt), { addSuffix: true })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes grid {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(-10px);
          }
        }
        .bg-grid-white {
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
}
