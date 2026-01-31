import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, X } from 'lucide-react';
import { useGetActiveCampaigns, useWatchAdFromCampaign, useGetAdViewHistory, useGetMaxAdViewsPerDay, useGetMaxAdsPerYoutubeSession } from '../hooks/useQueries';
import type { AdCampaign } from '../backend';

interface YouTubePlayerProps {
  videoUrl: string;
  onClose: () => void;
}

export default function YouTubePlayer({ videoUrl, onClose }: YouTubePlayerProps) {
  const [showingAd, setShowingAd] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [adProgress, setAdProgress] = useState(0);
  const [adsShown, setAdsShown] = useState(0);
  const [videoStarted, setVideoStarted] = useState(false);
  
  const { data: activeCampaigns } = useGetActiveCampaigns();
  const { data: adViewHistory } = useGetAdViewHistory();
  const { data: maxAdViews } = useGetMaxAdViewsPerDay();
  const { data: maxAdsPerSession } = useGetMaxAdsPerYoutubeSession();
  const watchAd = useWatchAdFromCampaign();

  const dailyViews = Number(adViewHistory?.dailyViews || 0n);
  const maxDailyViews = Number(maxAdViews || 20n);
  const maxSessionAds = Number(maxAdsPerSession || 3n);
  const remainingDailyViews = Math.max(0, maxDailyViews - dailyViews);

  const getVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
      /youtube\.com\/embed\/([^?&\s]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const videoId = getVideoId(videoUrl);

  const getRandomActiveCampaign = (): AdCampaign | null => {
    if (!activeCampaigns || activeCampaigns.length === 0) return null;
    const eligibleCampaigns = activeCampaigns.filter((c) => c.budget > 0n);
    if (eligibleCampaigns.length === 0) return null;
    return eligibleCampaigns[Math.floor(Math.random() * eligibleCampaigns.length)];
  };

  const showAdBeforeVideo = () => {
    if (remainingDailyViews <= 0 || adsShown >= maxSessionAds) {
      setVideoStarted(true);
      return;
    }

    const campaign = getRandomActiveCampaign();
    if (campaign) {
      setSelectedCampaign(campaign);
      setShowingAd(true);
      setAdProgress(0);
    } else {
      setVideoStarted(true);
    }
  };

  useEffect(() => {
    // Show ad before video starts
    showAdBeforeVideo();
  }, []);

  useEffect(() => {
    if (showingAd && selectedCampaign) {
      const interval = setInterval(() => {
        setAdProgress((prev) => {
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
    if (!selectedCampaign || !videoId) return;

    try {
      await watchAd.mutateAsync({
        campaignId: selectedCampaign.id,
        videoId: `youtube_${videoId}`,
      });
      setAdsShown((prev) => prev + 1);
    } catch (error) {
      console.error('Failed to record ad view:', error);
    } finally {
      setShowingAd(false);
      setSelectedCampaign(null);
      setVideoStarted(true);
    }
  };

  const formatAdReward = (amount: bigint) => {
    return `$${(Number(amount) / 100000000).toFixed(2)}`;
  };

  if (!videoId) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Invalid YouTube URL</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </Card>
    );
  }

  return (
    <>
      {showingAd && selectedCampaign ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Advertisement</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="flex flex-col items-center gap-4 w-full h-full justify-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Ad playing...</p>
              <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full">
                <img src="/assets/generated/ad-icon-transparent.dim_64x64.png" alt="Ad" className="h-5 w-5" />
                <span className="text-sm font-medium">Earning {formatAdReward(selectedCampaign.payoutPerView)}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
                <Progress value={adProgress} className="h-2" />
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {adProgress < 100 ? `${Math.round(adProgress)}% complete` : 'Ad complete!'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">{selectedCampaign.title}</h4>
            <p className="text-sm text-muted-foreground">{selectedCampaign.description}</p>
          </div>
        </div>
      ) : videoStarted ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/assets/generated/youtube-logo-transparent.dim_64x64.png" alt="YouTube" className="h-6 w-6" />
              <h3 className="text-lg font-semibold">YouTube Video</h3>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {adsShown < maxSessionAds && remainingDailyViews > 0 && (
            <div className="bg-gradient-to-br from-accent/10 to-primary/10 border border-primary/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ads shown this session: {adsShown} / {maxSessionAds}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Daily views remaining: {remainingDailyViews}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      )}
    </>
  );
}
