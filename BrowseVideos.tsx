import { useGetAllVideos, useRecordWatch, useGetAdRewardRate, useGetAdViewHistory, useGetMaxAdViewsPerDay, useGetActiveCampaigns, useWatchAdFromCampaign, useGetFeaturedYoutubeVideos, useGetFeaturedYoutubePlaylistId } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, Eye, Clock, DollarSign, Loader2, Coins, TrendingUp, Youtube, ListVideo } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { Video, AdCampaign } from '../backend';
import YouTubePlayer from './YouTubePlayer';

export default function BrowseVideos() {
  const { data: videos, isLoading } = useGetAllVideos();
  const { data: activeCampaigns } = useGetActiveCampaigns();
  const { data: adRewardRate } = useGetAdRewardRate();
  const { data: adViewHistory } = useGetAdViewHistory();
  const { data: maxAdViews } = useGetMaxAdViewsPerDay();
  const { data: featuredYoutubeVideos } = useGetFeaturedYoutubeVideos();
  const { data: featuredPlaylistId } = useGetFeaturedYoutubePlaylistId();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [showingAd, setShowingAd] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string | null>(null);
  const recordWatch = useRecordWatch();
  const watchAd = useWatchAdFromCampaign();

  const formatAdReward = (rate: bigint | undefined) => {
    if (!rate) return '$0.00';
    return `$${(Number(rate) / 100000000).toFixed(2)}`;
  };

  const getRandomActiveCampaign = (): AdCampaign | null => {
    if (!activeCampaigns || activeCampaigns.length === 0) return null;
    const eligibleCampaigns = activeCampaigns.filter((c) => c.budget > 0n);
    if (eligibleCampaigns.length === 0) return null;
    return eligibleCampaigns[Math.floor(Math.random() * eligibleCampaigns.length)];
  };

  useEffect(() => {
    if (isPlaying && selectedVideo) {
      const interval = setInterval(() => {
        setWatchProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleVideoComplete();
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPlaying, selectedVideo]);

  const handleVideoComplete = async () => {
    if (!selectedVideo) return;

    try {
      await recordWatch.mutateAsync({ videoId: selectedVideo.id });
      
      if (selectedVideo.monetizationType.__kind__ === 'adSupported') {
        const campaign = getRandomActiveCampaign();
        if (campaign) {
          setSelectedCampaign(campaign);
          setShowingAd(true);
          setWatchProgress(0);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Failed to record video completion:', error);
    }
  };

  useEffect(() => {
    if (showingAd && selectedCampaign) {
      const interval = setInterval(() => {
        setWatchProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleAdComplete();
            return 100;
          }
          return prev + 2;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [showingAd, selectedCampaign]);

  const handleAdComplete = async () => {
    if (!selectedCampaign || !selectedVideo) return;

    try {
      await watchAd.mutateAsync({
        campaignId: selectedCampaign.id,
        videoId: selectedVideo.id,
      });
    } catch (error) {
      console.error('Failed to record ad view:', error);
    } finally {
      setShowingAd(false);
      setSelectedCampaign(null);
    }
  };

  const handleWatchVideo = (video: Video) => {
    setSelectedVideo(video);
    setIsPlaying(true);
    setWatchProgress(0);
    setShowingAd(false);
  };

  const handleCloseDialog = () => {
    setSelectedVideo(null);
    setIsPlaying(false);
    setWatchProgress(0);
    setShowingAd(false);
    setSelectedCampaign(null);
  };

  const handleWatchYoutube = (url: string) => {
    setSelectedYoutubeUrl(url);
  };

  const handleCloseYoutube = () => {
    setSelectedYoutubeUrl(null);
    setYoutubeUrl('');
  };

  const getMonetizationBadge = (video: Video) => {
    if (video.monetizationType.__kind__ === 'adSupported') {
      return (
        <Badge variant="secondary" className="gap-1">
          <Coins className="h-3 w-3" />
          Ad Supported
        </Badge>
      );
    } else if (video.monetizationType.__kind__ === 'subscription') {
      return <Badge variant="default">Subscription</Badge>;
    } else {
      return <Badge variant="outline">Pay-per-view</Badge>;
    }
  };

  const getPrice = (video: Video) => {
    if (video.monetizationType.__kind__ === 'subscription') {
      return `$${Number(video.monetizationType.subscription.price) / 100}/mo`;
    } else if (video.monetizationType.__kind__ === 'payPerView') {
      return `$${Number(video.monetizationType.payPerView.price) / 100}`;
    }
    return 'Free';
  };

  const isAdSupported = (video: Video) => video.monetizationType.__kind__ === 'adSupported';

  const extractPlaylistId = (input: string): string | null => {
    // Handle playlist ID directly
    if (input.match(/^[A-Za-z0-9_-]+$/)) {
      return input;
    }
    
    // Handle full YouTube playlist URLs
    const patterns = [
      /[?&]list=([A-Za-z0-9_-]+)/,
      /youtube\.com\/playlist\?list=([A-Za-z0-9_-]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const getPlaylistEmbedUrl = (playlistId: string): string => {
    return `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1`;
  };

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-48 w-full rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const approvedVideos = videos?.filter((v) => v.status === 'approved') || [];
  const dailyViews = Number(adViewHistory?.dailyViews || 0n);
  const maxDailyViews = Number(maxAdViews || 20n);
  const remainingAdViews = Math.max(0, maxDailyViews - dailyViews);
  const playlistId = featuredPlaylistId ? extractPlaylistId(featuredPlaylistId) : null;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Browse Videos</h2>
            <p className="text-muted-foreground">Watch videos and earn rewards</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-lg px-4 py-2">
              {approvedVideos.length} Videos
            </Badge>
          </div>
        </div>

        <Card className="bg-gradient-to-br from-accent/10 to-primary/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <img src="/assets/generated/ad-earnings-coins-transparent.dim_128x128.png" alt="Ad Earnings" className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Ad Views</p>
                  <p className="text-2xl font-bold">{dailyViews} / {maxDailyViews}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Earn per ad</p>
                <p className="text-2xl font-bold text-primary">{formatAdReward(adRewardRate)}</p>
              </div>
            </div>
            <Progress value={(dailyViews / maxDailyViews) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {remainingAdViews > 0 
                ? `${remainingAdViews} ad views remaining today` 
                : 'Daily limit reached. Come back tomorrow!'}
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="internal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal" className="gap-2">
              <Play className="h-4 w-4" />
              Internal Videos
            </TabsTrigger>
            <TabsTrigger value="youtube" className="gap-2">
              <Youtube className="h-4 w-4" />
              Watch YouTube
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internal" className="mt-6">
            {approvedVideos.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Play className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No videos available yet</p>
                  <p className="text-sm text-muted-foreground">Check back soon for new content!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedVideos.map((video) => (
                  <Card key={video.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className="p-0">
                      <div className="relative aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Play className="h-16 w-16 text-primary/50" />
                        <div className="absolute top-2 right-2">
                          {getMonetizationBadge(video)}
                        </div>
                        {isAdSupported(video) && (
                          <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-green-500" />
                            <span className="text-xs font-medium">Earn rewards</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-lg mb-2 line-clamp-2">{video.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mb-4">
                        {video.description}
                      </CardDescription>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {video.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{Number(video.views)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4" />
                          <span>{getPrice(video)}</span>
                        </div>
                      </div>

                      <Button
                        className="w-full gap-2"
                        onClick={() => handleWatchVideo(video)}
                      >
                        <Play className="h-4 w-4" />
                        Watch Now
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="youtube" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <img src="/assets/generated/youtube-logo-transparent.dim_64x64.png" alt="YouTube" className="h-6 w-6" />
                    Watch YouTube Videos
                  </CardTitle>
                  <CardDescription>
                    Paste a YouTube URL to watch and earn rewards from ads
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="youtube-url">YouTube Video URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="youtube-url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                      />
                      <Button
                        onClick={() => handleWatchYoutube(youtubeUrl)}
                        disabled={!youtubeUrl}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        Watch
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {playlistId && (
                <div>
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                    <ListVideo className="h-6 w-6" />
                    🎬 Featured YouTube Playlist – Watch & Earn
                  </h3>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow border-red-500/30">
                    <CardHeader className="p-0">
                      <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                        <img src="/assets/generated/youtube-play-icon-transparent.dim_64x64.png" alt="YouTube Playlist" className="h-20 w-20 opacity-50" />
                        <div className="absolute top-2 right-2">
                          <Badge variant="secondary" className="gap-1 bg-red-500 text-white">
                            <ListVideo className="h-3 w-3" />
                            Playlist
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-md flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Watch & Earn Rewards</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CardTitle className="text-xl mb-3 flex items-center gap-2">
                        <Youtube className="h-6 w-6 text-red-500" />
                        Featured YouTube Playlist
                      </CardTitle>
                      <CardDescription className="mb-4">
                        Stream real online YouTube videos via mobile internet with autoplay and reward tracking enabled
                      </CardDescription>

                      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-md">
                        <ListVideo className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Playlist ID: {playlistId}</span>
                      </div>

                      <Button
                        className="w-full gap-2 bg-red-500 hover:bg-red-600"
                        onClick={() => handleWatchYoutube(getPlaylistEmbedUrl(playlistId))}
                      >
                        <Play className="h-4 w-4" />
                        Watch Playlist Now
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {featuredYoutubeVideos && featuredYoutubeVideos.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Featured YouTube Videos</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {featuredYoutubeVideos.map((url, idx) => (
                      <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                        <CardHeader className="p-0">
                          <div className="relative aspect-video bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center">
                            <img src="/assets/generated/youtube-play-icon-transparent.dim_64x64.png" alt="YouTube" className="h-16 w-16 opacity-50" />
                            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-green-500" />
                              <span className="text-xs font-medium">Earn rewards</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4">
                          <CardTitle className="text-lg mb-2 line-clamp-1 flex items-center gap-2">
                            <Youtube className="h-5 w-5 text-red-500" />
                            YouTube Video
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mb-4 text-xs">
                            {url}
                          </CardDescription>

                          <Button
                            className="w-full gap-2"
                            onClick={() => handleWatchYoutube(url)}
                          >
                            <Play className="h-4 w-4" />
                            Watch Now
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {(!featuredYoutubeVideos || featuredYoutubeVideos.length === 0) && !playlistId && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Youtube className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No featured content yet</p>
                    <p className="text-sm text-muted-foreground">Paste a YouTube URL above to get started!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!selectedVideo} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{showingAd ? 'Advertisement' : selectedVideo?.title}</DialogTitle>
            <DialogDescription>
              {showingAd ? selectedCampaign?.description : selectedVideo?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center relative overflow-hidden">
              {isPlaying ? (
                <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {showingAd ? 'Ad playing...' : 'Video playing...'}
                  </p>
                  {showingAd && selectedCampaign && (
                    <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full">
                      <img src="/assets/generated/ad-icon-transparent.dim_64x64.png" alt="Ad" className="h-5 w-5" />
                      <span className="text-sm font-medium">Earning {formatAdReward(selectedCampaign.payoutPerView)}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                    <Progress value={watchProgress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      {watchProgress < 100 ? `${Math.round(watchProgress)}% complete` : showingAd ? 'Ad complete!' : 'Video complete!'}
                    </p>
                  </div>
                </div>
              ) : (
                <Play className="h-24 w-24 text-primary/50" />
              )}
            </div>

            {!showingAd && selectedVideo && (
              <>
                <div className="flex flex-wrap gap-2">
                  {selectedVideo.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{Number(selectedVideo.views)}</p>
                      <p className="text-xs text-muted-foreground">Views</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(Number(selectedVideo.uploadTime) / 1000000).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Uploaded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{getPrice(selectedVideo)}</p>
                      <p className="text-xs text-muted-foreground">Price</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedYoutubeUrl} onOpenChange={() => handleCloseYoutube()}>
        <DialogContent className="max-w-4xl">
          {selectedYoutubeUrl && (
            <YouTubePlayer videoUrl={selectedYoutubeUrl} onClose={handleCloseYoutube} />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
