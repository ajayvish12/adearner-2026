import { useGetAllVideos, useApproveVideo, useRejectVideo, useIsStripeConfigured, useSetStripeConfiguration, useGetAdRewardRate, useSetAdRewardRate, useGetMaxAdViewsPerDay, useSetMaxAdViewsPerDay, useGetAllCampaignsForAdmin, useApproveAdCampaign, useRejectAdCampaign, useGetYoutubeChannels, useGetFeaturedYoutubeVideos, useAddYoutubeChannel, useRemoveYoutubeChannel, useAddFeaturedYoutubeVideo, useRemoveFeaturedYoutubeVideo, useGetMaxAdsPerYoutubeSession, useSetMaxAdsPerYoutubeSession, useGetAdMobConfiguration, useSetAdMobConfiguration, useGetFeaturedYoutubePlaylistId, useSetFeaturedYoutubePlaylistId, useClearFeaturedYoutubePlaylist, useIsBandwidthEarningsConfigured, useSetBandwidthEarningsConfig, useGetAllPayoutRequests, useUpdatePayoutRequestStatus } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Video, CheckCircle, XCircle, Eye, Clock, CreditCard, Loader2, Settings, Megaphone, Target, DollarSign, Youtube, Trash2, Plus, Smartphone, Info, ListVideo, Wifi, Lock, Ban } from 'lucide-react';
import { SiPaypal, SiStripe } from 'react-icons/si';
import { useState } from 'react';
import type { Video as VideoType, AdCampaign } from '../backend';
import { PayoutProvider, PayoutRequestStatus } from '../backend';

export default function AdminDashboard() {
  const { data: videos, isLoading } = useGetAllVideos();
  const { data: campaigns, isLoading: campaignsLoading } = useGetAllCampaignsForAdmin();
  const { data: isStripeConfigured, isLoading: stripeLoading } = useIsStripeConfigured();
  const { data: adRewardRate, isLoading: adRateLoading } = useGetAdRewardRate();
  const { data: maxAdViews, isLoading: maxAdViewsLoading } = useGetMaxAdViewsPerDay();
  const { data: youtubeChannels } = useGetYoutubeChannels();
  const { data: featuredVideos } = useGetFeaturedYoutubeVideos();
  const { data: maxAdsPerSession } = useGetMaxAdsPerYoutubeSession();
  const { data: adMobConfig, isLoading: adMobLoading } = useGetAdMobConfiguration();
  const { data: featuredPlaylistId } = useGetFeaturedYoutubePlaylistId();
  const { data: isBandwidthConfigured, isLoading: bandwidthConfigLoading } = useIsBandwidthEarningsConfigured();
  const { data: allPayoutRequests, isLoading: payoutsLoading } = useGetAllPayoutRequests();
  
  const approveVideo = useApproveVideo();
  const rejectVideo = useRejectVideo();
  const approveCampaign = useApproveAdCampaign();
  const rejectCampaign = useRejectAdCampaign();
  const setStripeConfig = useSetStripeConfiguration();
  const setAdRate = useSetAdRewardRate();
  const setMaxAdViews = useSetMaxAdViewsPerDay();
  const addYoutubeChannel = useAddYoutubeChannel();
  const removeYoutubeChannel = useRemoveYoutubeChannel();
  const addFeaturedVideo = useAddFeaturedYoutubeVideo();
  const removeFeaturedVideo = useRemoveFeaturedYoutubeVideo();
  const setMaxAdsPerSession = useSetMaxAdsPerYoutubeSession();
  const setAdMobConfig = useSetAdMobConfiguration();
  const setFeaturedPlaylistId = useSetFeaturedYoutubePlaylistId();
  const clearFeaturedPlaylist = useClearFeaturedYoutubePlaylist();
  const setBandwidthConfig = useSetBandwidthEarningsConfig();
  const updatePayoutStatus = useUpdatePayoutRequestStatus();

  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [allowedCountries, setAllowedCountries] = useState('US,CA,GB');
  const [showStripeDialog, setShowStripeDialog] = useState(false);
  const [showAdConfigDialog, setShowAdConfigDialog] = useState(false);
  const [showYoutubeDialog, setShowYoutubeDialog] = useState(false);
  const [showAdMobDialog, setShowAdMobDialog] = useState(false);
  const [showBandwidthDialog, setShowBandwidthDialog] = useState(false);
  const [newAdRate, setNewAdRate] = useState('');
  const [newMaxAdViews, setNewMaxAdViews] = useState('');
  const [newMaxAdsPerSession, setNewMaxAdsPerSession] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [newFeaturedVideoUrl, setNewFeaturedVideoUrl] = useState('');
  const [newPlaylistId, setNewPlaylistId] = useState('');
  
  const [adMobAppId, setAdMobAppId] = useState('');
  const [adMobBannerAdUnitId, setAdMobBannerAdUnitId] = useState('');
  const [adMobInterstitialAdUnitId, setAdMobInterstitialAdUnitId] = useState('');
  const [adMobRewardedAdUnitId, setAdMobRewardedAdUnitId] = useState('');
  const [adMobNativeAdUnitId, setAdMobNativeAdUnitId] = useState('');

  const [bandwidthApiKey, setBandwidthApiKey] = useState('');
  const [bandwidthApiSecret, setBandwidthApiSecret] = useState('');
  const [bandwidthProviderName, setBandwidthProviderName] = useState('');
  const [bandwidthProviderUrl, setBandwidthProviderUrl] = useState('');
  const [bandwidthMinPayout, setBandwidthMinPayout] = useState('');
  const [bandwidthCurrency, setBandwidthCurrency] = useState('USD');

  const pendingVideos = videos?.filter((v) => v.status === 'pendingReview') || [];
  const approvedVideos = videos?.filter((v) => v.status === 'approved') || [];
  const rejectedVideos = videos?.filter((v) => v.status === 'rejected') || [];

  const pendingCampaigns = campaigns?.filter((c) => c.status === 'pendingReview') || [];
  const activeCampaigns = campaigns?.filter((c) => c.status === 'active') || [];
  const rejectedCampaigns = campaigns?.filter((c) => c.status === 'rejected') || [];

  const formatAdReward = (rate: bigint | undefined) => {
    if (!rate) return '$0.00';
    return `$${(Number(rate) / 100000000).toFixed(2)}`;
  };

  const formatCurrency = (amount: bigint) => {
    return `$${(Number(amount) / 100000000).toFixed(2)}`;
  };

  const handleApprove = async (videoId: string) => {
    await approveVideo.mutateAsync(videoId);
  };

  const handleReject = async (videoId: string) => {
    await rejectVideo.mutateAsync(videoId);
  };

  const handleApproveCampaign = async (campaignId: string) => {
    await approveCampaign.mutateAsync(campaignId);
  };

  const handleRejectCampaign = async (campaignId: string) => {
    await rejectCampaign.mutateAsync(campaignId);
  };

  const handleStripeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    await setStripeConfig.mutateAsync({
      secretKey: stripeSecretKey,
      allowedCountries: allowedCountries.split(',').map((c) => c.trim()),
    });
    setShowStripeDialog(false);
  };

  const handleAdConfigSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newAdRate) {
      const rateInE8s = BigInt(Math.round(parseFloat(newAdRate) * 100000000));
      await setAdRate.mutateAsync(rateInE8s);
    }
    
    if (newMaxAdViews) {
      await setMaxAdViews.mutateAsync(BigInt(parseInt(newMaxAdViews)));
    }
    
    setShowAdConfigDialog(false);
    setNewAdRate('');
    setNewMaxAdViews('');
  };

  const handleYoutubeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMaxAdsPerSession) {
      await setMaxAdsPerSession.mutateAsync(BigInt(parseInt(newMaxAdsPerSession)));
    }
    
    setShowYoutubeDialog(false);
    setNewMaxAdsPerSession('');
  };

  const handleAdMobSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await setAdMobConfig.mutateAsync({
      appId: adMobAppId,
      bannerAdUnitId: adMobBannerAdUnitId,
      interstitialAdUnitId: adMobInterstitialAdUnitId,
      rewardedAdUnitId: adMobRewardedAdUnitId || undefined,
      nativeAdUnitId: adMobNativeAdUnitId || undefined,
    });
    
    setShowAdMobDialog(false);
  };

  const handleBandwidthSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await setBandwidthConfig.mutateAsync({
      apiKey: bandwidthApiKey,
      apiSecret: bandwidthApiSecret,
      providerName: bandwidthProviderName,
      providerUrl: bandwidthProviderUrl,
      minPayoutThreshold: BigInt(Math.round(parseFloat(bandwidthMinPayout) * 100000000)),
      payoutCurrency: bandwidthCurrency,
    });
    
    setShowBandwidthDialog(false);
  };

  const handleAddChannel = async () => {
    if (newChannelUrl) {
      await addYoutubeChannel.mutateAsync(newChannelUrl);
      setNewChannelUrl('');
    }
  };

  const handleRemoveChannel = async (url: string) => {
    await removeYoutubeChannel.mutateAsync(url);
  };

  const handleAddFeaturedVideo = async () => {
    if (newFeaturedVideoUrl) {
      await addFeaturedVideo.mutateAsync(newFeaturedVideoUrl);
      setNewFeaturedVideoUrl('');
    }
  };

  const handleRemoveFeaturedVideo = async (url: string) => {
    await removeFeaturedVideo.mutateAsync(url);
  };

  const handleSetPlaylist = async () => {
    if (newPlaylistId) {
      await setFeaturedPlaylistId.mutateAsync(newPlaylistId);
      setNewPlaylistId('');
    }
  };

  const handleClearPlaylist = async () => {
    await clearFeaturedPlaylist.mutateAsync();
  };

  const handleOpenAdMobDialog = () => {
    if (adMobConfig) {
      setAdMobAppId(adMobConfig.appId);
      setAdMobBannerAdUnitId(adMobConfig.bannerAdUnitId);
      setAdMobInterstitialAdUnitId(adMobConfig.interstitialAdUnitId);
      setAdMobRewardedAdUnitId(adMobConfig.rewardedAdUnitId || '');
      setAdMobNativeAdUnitId(adMobConfig.nativeAdUnitId || '');
    } else {
      setAdMobAppId('');
      setAdMobBannerAdUnitId('');
      setAdMobInterstitialAdUnitId('');
      setAdMobRewardedAdUnitId('');
      setAdMobNativeAdUnitId('');
    }
    setShowAdMobDialog(true);
  };

  const handlePayoutAction = async (payoutRequestId: string, newStatus: PayoutRequestStatus) => {
    await updatePayoutStatus.mutateAsync({
      payoutRequestId,
      newStatus,
    });
  };

  const getStatusBadge = (status: PayoutRequestStatus) => {
    const statusMap: Record<PayoutRequestStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      [PayoutRequestStatus.confirmed]: { variant: 'default', label: 'Paid' },
      [PayoutRequestStatus.processing]: { variant: 'secondary', label: 'Processing' },
      [PayoutRequestStatus.failed]: { variant: 'destructive', label: 'Failed' },
      [PayoutRequestStatus.pending]: { variant: 'outline', label: 'Pending' },
      [PayoutRequestStatus.cancelled]: { variant: 'destructive', label: 'Cancelled' },
    };
    const { variant, label } = statusMap[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const renderVideoCard = (video: VideoType, showActions: boolean = false) => (
    <Card key={video.id}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{video.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {video.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{Number(video.views)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{new Date(Number(video.uploadTime) / 1000000).toLocaleDateString()}</span>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={() => handleApprove(video.id)}
                disabled={approveVideo.isPending}
              >
                {approveVideo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => handleReject(video.id)}
                disabled={rejectVideo.isPending}
              >
                {rejectVideo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderCampaignCard = (campaign: AdCampaign, showActions: boolean = false) => (
    <Card key={campaign.id}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-semibold mb-1">{campaign.title}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {campaign.targetTags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs gap-1">
                <Target className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Budget</span>
              <span className="font-medium">{formatCurrency(campaign.budget)}</span>
            </div>
            <Progress 
              value={campaign.budget > 0n ? ((Number(campaign.spend) / (Number(campaign.spend) + Number(campaign.budget))) * 100) : 100} 
              className="h-2" 
            />
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Views</p>
              <p className="font-medium">{Number(campaign.views)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Spend</p>
              <p className="font-medium">{formatCurrency(campaign.spend)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payout/View</p>
              <p className="font-medium">{formatCurrency(campaign.payoutPerView)}</p>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 gap-2"
                onClick={() => handleApproveCampaign(campaign.id)}
                disabled={approveCampaign.isPending}
              >
                {approveCampaign.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => handleRejectCampaign(campaign.id)}
                disabled={rejectCampaign.isPending}
              >
                {rejectCampaign.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading || stripeLoading || adRateLoading || maxAdViewsLoading || campaignsLoading || adMobLoading || bandwidthConfigLoading || payoutsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <img src="/assets/generated/admin-icon-transparent.dim_64x64.png" alt="Admin" className="h-8 w-8" />
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground">Manage content, campaigns, payments, bandwidth providers, and platform settings</p>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{videos?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingVideos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ad Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className={isStripeConfigured ? 'border-green-500/50' : 'border-yellow-500/50'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Config
                </CardTitle>
                <CardDescription>
                  {isStripeConfigured ? 'Stripe configured' : 'Configure Stripe'}
                </CardDescription>
              </div>
              <Badge variant={isStripeConfigured ? 'default' : 'secondary'}>
                {isStripeConfigured ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog open={showStripeDialog} onOpenChange={setShowStripeDialog}>
              <DialogTrigger asChild>
                <Button variant={isStripeConfigured ? 'outline' : 'default'} className="w-full" size="sm">
                  {isStripeConfigured ? 'Update' : 'Configure'}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Stripe</DialogTitle>
                  <DialogDescription>
                    Enter your Stripe credentials to enable payment processing
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleStripeSetup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="secretKey">Stripe Secret Key</Label>
                    <Input
                      id="secretKey"
                      type="password"
                      placeholder="sk_test_..."
                      value={stripeSecretKey}
                      onChange={(e) => setStripeSecretKey(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="countries">Allowed Countries (comma-separated)</Label>
                    <Input
                      id="countries"
                      placeholder="US,CA,GB"
                      value={allowedCountries}
                      onChange={(e) => setAllowedCountries(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={setStripeConfig.isPending}>
                    {setStripeConfig.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <img src="/assets/generated/ad-icon-transparent.dim_64x64.png" alt="Ad Config" className="h-5 w-5" />
                  Ad Rewards
                </CardTitle>
                <CardDescription>
                  Configure rewards
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Settings className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Rate</p>
              <p className="font-bold text-primary">{formatAdReward(adRewardRate)}</p>
            </div>
            <Dialog open={showAdConfigDialog} onOpenChange={setShowAdConfigDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Ad Rewards</DialogTitle>
                  <DialogDescription>
                    Set the reward rate and daily limits for ad-supported videos
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdConfigSetup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adRate">Reward Rate (in ICP)</Label>
                    <Input
                      id="adRate"
                      type="number"
                      step="0.01"
                      placeholder={formatAdReward(adRewardRate)}
                      value={newAdRate}
                      onChange={(e) => setNewAdRate(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {formatAdReward(adRewardRate)} per ad view
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxViews">Daily Ad View Limit</Label>
                    <Input
                      id="maxViews"
                      type="number"
                      placeholder={Number(maxAdViews || 0n).toString()}
                      value={newMaxAdViews}
                      onChange={(e) => setNewMaxAdViews(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {Number(maxAdViews || 0n)} views per day
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={setAdRate.isPending || setMaxAdViews.isPending}>
                    {(setAdRate.isPending || setMaxAdViews.isPending) ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="border-red-500/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <img src="/assets/generated/youtube-logo-transparent.dim_64x64.png" alt="YouTube" className="h-5 w-5" />
                  YouTube
                </CardTitle>
                <CardDescription>
                  Manage integration
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Youtube className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-sm">
              <p className="text-xs text-muted-foreground">Max Ads</p>
              <p className="font-bold">{Number(maxAdsPerSession || 3n)}</p>
            </div>
            <Dialog open={showYoutubeDialog} onOpenChange={setShowYoutubeDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>YouTube Management</DialogTitle>
                  <DialogDescription>
                    Configure YouTube channels, featured videos, playlists, and ad settings
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleYoutubeSetup} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="maxAdsSession">Max Ads Per YouTube Session</Label>
                    <Input
                      id="maxAdsSession"
                      type="number"
                      placeholder={Number(maxAdsPerSession || 3n).toString()}
                      value={newMaxAdsPerSession}
                      onChange={(e) => setNewMaxAdsPerSession(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Current: {Number(maxAdsPerSession || 3n)} ads per session
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={setMaxAdsPerSession.isPending}>
                    {setMaxAdsPerSession.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </Button>
                </form>

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <ListVideo className="h-4 w-4" />
                      Featured YouTube Playlist
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Set a YouTube playlist ID or URL to display in the Browse Videos tab
                    </p>
                    {featuredPlaylistId && (
                      <div className="mb-3 p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">Current Playlist:</p>
                        <p className="text-xs text-muted-foreground break-all">{featuredPlaylistId}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mb-2">
                      <Input
                        placeholder="Playlist ID or URL (e.g., PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG)"
                        value={newPlaylistId}
                        onChange={(e) => setNewPlaylistId(e.target.value)}
                      />
                      <Button onClick={handleSetPlaylist} disabled={!newPlaylistId}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {featuredPlaylistId && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleClearPlaylist}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Playlist
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h4 className="font-semibold mb-2">Featured YouTube Videos</h4>
                    <div className="flex gap-2 mb-3">
                      <Input
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={newFeaturedVideoUrl}
                        onChange={(e) => setNewFeaturedVideoUrl(e.target.value)}
                      />
                      <Button onClick={handleAddFeaturedVideo} disabled={!newFeaturedVideoUrl}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {featuredVideos && featuredVideos.length > 0 ? (
                        featuredVideos.map((url, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <span className="text-sm truncate flex-1">{url}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveFeaturedVideo(url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No featured videos yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className={adMobConfig ? 'border-blue-500/50' : 'border-gray-500/50'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  AdMob
                </CardTitle>
                <CardDescription>
                  Google AdMob
                </CardDescription>
              </div>
              <Badge variant={adMobConfig ? 'default' : 'secondary'}>
                {adMobConfig ? 'Set' : 'Not Set'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog open={showAdMobDialog} onOpenChange={setShowAdMobDialog}>
              <DialogTrigger asChild>
                <Button variant={adMobConfig ? 'outline' : 'default'} className="w-full" size="sm" onClick={handleOpenAdMobDialog}>
                  <Settings className="h-4 w-4 mr-2" />
                  {adMobConfig ? 'Update' : 'Configure'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configure AdMob</DialogTitle>
                  <DialogDescription>
                    Enter your Google AdMob credentials for future compatibility
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAdMobSetup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adMobAppId">App ID *</Label>
                    <Input
                      id="adMobAppId"
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
                      value={adMobAppId}
                      onChange={(e) => setAdMobAppId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adMobBannerAdUnitId">Banner Ad Unit ID *</Label>
                    <Input
                      id="adMobBannerAdUnitId"
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                      value={adMobBannerAdUnitId}
                      onChange={(e) => setAdMobBannerAdUnitId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adMobInterstitialAdUnitId">Interstitial Ad Unit ID *</Label>
                    <Input
                      id="adMobInterstitialAdUnitId"
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                      value={adMobInterstitialAdUnitId}
                      onChange={(e) => setAdMobInterstitialAdUnitId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adMobRewardedAdUnitId">Rewarded Ad Unit ID (Optional)</Label>
                    <Input
                      id="adMobRewardedAdUnitId"
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                      value={adMobRewardedAdUnitId}
                      onChange={(e) => setAdMobRewardedAdUnitId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adMobNativeAdUnitId">Native Ad Unit ID (Optional)</Label>
                    <Input
                      id="adMobNativeAdUnitId"
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                      value={adMobNativeAdUnitId}
                      onChange={(e) => setAdMobNativeAdUnitId(e.target.value)}
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Google AdMob integration is not active yet on the Internet Computer. These settings are for future compatibility.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={setAdMobConfig.isPending}>
                    {setAdMobConfig.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className={isBandwidthConfigured ? 'border-green-500/50' : 'border-orange-500/50'}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Bandwidth API
                </CardTitle>
                <CardDescription>
                  Provider config
                </CardDescription>
              </div>
              <Badge variant={isBandwidthConfigured ? 'default' : 'secondary'}>
                {isBandwidthConfigured ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Dialog open={showBandwidthDialog} onOpenChange={setShowBandwidthDialog}>
              <DialogTrigger asChild>
                <Button variant={isBandwidthConfigured ? 'outline' : 'default'} className="w-full" size="sm">
                  <Lock className="h-4 w-4 mr-2" />
                  {isBandwidthConfigured ? 'Update' : 'Configure'}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Configure Bandwidth Provider API</DialogTitle>
                  <DialogDescription>
                    Enter external bandwidth provider API credentials for real earnings integration
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBandwidthSetup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bandwidthProviderName">Provider Name *</Label>
                    <Input
                      id="bandwidthProviderName"
                      placeholder="e.g., Honeygain, PacketStream"
                      value={bandwidthProviderName}
                      onChange={(e) => setBandwidthProviderName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bandwidthProviderUrl">Provider API URL *</Label>
                    <Input
                      id="bandwidthProviderUrl"
                      placeholder="https://api.provider.com"
                      value={bandwidthProviderUrl}
                      onChange={(e) => setBandwidthProviderUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bandwidthApiKey">API Key *</Label>
                    <Input
                      id="bandwidthApiKey"
                      type="password"
                      placeholder="Your provider API key"
                      value={bandwidthApiKey}
                      onChange={(e) => setBandwidthApiKey(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bandwidthApiSecret">API Secret *</Label>
                    <Input
                      id="bandwidthApiSecret"
                      type="password"
                      placeholder="Your provider API secret"
                      value={bandwidthApiSecret}
                      onChange={(e) => setBandwidthApiSecret(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bandwidthMinPayout">Minimum Payout Threshold (USD) *</Label>
                    <Input
                      id="bandwidthMinPayout"
                      type="number"
                      step="0.01"
                      placeholder="5.00"
                      value={bandwidthMinPayout}
                      onChange={(e) => setBandwidthMinPayout(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bandwidthCurrency">Payout Currency *</Label>
                    <Input
                      id="bandwidthCurrency"
                      placeholder="USD"
                      value={bandwidthCurrency}
                      onChange={(e) => setBandwidthCurrency(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      Configure external bandwidth provider API for real earnings. All traffic will be encrypted and routed through the provider's network. Users must consent before activation.
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={setBandwidthConfig.isPending}>
                    {setBandwidthConfig.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Configuration'
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="videos" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="videos">
            Video Management
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            Advertiser Management
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Payout Management
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-6">
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingVideos.length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({approvedVideos.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedVideos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              {pendingVideos.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {pendingVideos.map((video) => renderVideoCard(video, true))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No pending videos</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              {approvedVideos.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {approvedVideos.map((video) => renderVideoCard(video))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <CheckCircle className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No approved videos</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              {rejectedVideos.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {rejectedVideos.map((video) => renderVideoCard(video))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No rejected videos</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <Tabs defaultValue="pending">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">
                Pending ({pendingCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                Active ({activeCampaigns.length})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({rejectedCampaigns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              {pendingCampaigns.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {pendingCampaigns.map((campaign) => renderCampaignCard(campaign, true))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <img src="/assets/generated/approval-icon-transparent.dim_64x64.png" alt="Approval" className="h-16 w-16 opacity-50 mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No pending campaigns</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="active" className="mt-6">
              {activeCampaigns.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {activeCampaigns.map((campaign) => renderCampaignCard(campaign))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Megaphone className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No active campaigns</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              {rejectedCampaigns.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {rejectedCampaigns.map((campaign) => renderCampaignCard(campaign))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <XCircle className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No rejected campaigns</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All User Payout Requests</CardTitle>
              <CardDescription>Manage withdrawal requests from all users</CardDescription>
            </CardHeader>
            <CardContent>
              {allPayoutRequests && allPayoutRequests.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPayoutRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono text-xs">
                            {request.userId.toString().slice(0, 8)}...
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(request.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {request.provider === PayoutProvider.paypal ? (
                                <>
                                  <SiPaypal className="h-4 w-4 text-[#0070ba]" />
                                  <span>PayPal</span>
                                </>
                              ) : (
                                <>
                                  <SiStripe className="h-4 w-4 text-[#635bff]" />
                                  <span>Stripe</span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(request.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(Number(request.createdAt) / 1000000).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {request.status === PayoutRequestStatus.pending && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handlePayoutAction(request.id, PayoutRequestStatus.confirmed)}
                                    disabled={updatePayoutStatus.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handlePayoutAction(request.id, PayoutRequestStatus.failed)}
                                    disabled={updatePayoutStatus.isPending}
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {(request.status === PayoutRequestStatus.pending || request.status === PayoutRequestStatus.processing) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePayoutAction(request.id, PayoutRequestStatus.cancelled)}
                                  disabled={updatePayoutStatus.isPending}
                                >
                                  <Ban className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No payout requests yet</p>
                  <p className="text-sm text-muted-foreground mt-1">User payout requests will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
