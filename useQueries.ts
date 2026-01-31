import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { useInternetIdentity } from './useInternetIdentity';
import type { Profile, Video, Wallet, RewardHistory, VideoMonetizationType, VideoId, UserRole, AdCampaign, CampaignId, AdRewardHistory, AdMobConfig, UserBandwidthEarnings, BandwidthEarningsDashboard, T, BandwidthEarningsConfig, PayoutRequest, PayoutProvider, AdminPayoutUpdateRequest } from '../backend';
import { ExternalBlob } from '../backend';
import { toast } from 'sonner';
import { Principal } from '@dfinity/principal';

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<Profile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: Profile) => {
      if (!actor) throw new Error('Actor not available');
      await actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
      toast.success('Profile saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save profile: ${error.message}`);
    },
  });
}

export function useGetAllVideos() {
  const { actor, isFetching } = useActor();

  return useQuery<Video[]>({
    queryKey: ['videos'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllVideos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetCreatedVideos() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Video[]>({
    queryKey: ['createdVideos', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      return actor.getAllCreatedVideos(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useUploadVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      tags,
      videoBlob,
      monetizationType,
      price,
    }: {
      title: string;
      description: string;
      tags: string[];
      videoBlob: ExternalBlob;
      monetizationType: VideoMonetizationType;
      price: bigint | null;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.uploadVideo(title, description, tags, videoBlob, monetizationType, price);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['createdVideos'] });
      toast.success('Video uploaded successfully! Awaiting admin approval.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload video: ${error.message}`);
    },
  });
}

export function useApproveVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: VideoId) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveVideo(videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve video: ${error.message}`);
    },
  });
}

export function useRejectVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoId: VideoId) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectVideo(videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject video: ${error.message}`);
    },
  });
}

export function useGetWallet() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<Wallet>({
    queryKey: ['wallet', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getWallet(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useRecordWatch() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId }: { videoId: VideoId }) => {
      if (!actor) throw new Error('Actor not available');
      if (!identity) throw new Error('Not authenticated');
      return actor.recordWatch(identity.getPrincipal(), videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });
}

export function useRecordAdView() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ videoId }: { videoId: VideoId }) => {
      if (!actor) throw new Error('Actor not available');
      if (!identity) throw new Error('Not authenticated');
      await actor.recordAdView(identity.getPrincipal(), videoId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['adViewHistory'] });
      toast.success('Ad reward earned!');
    },
    onError: (error: Error) => {
      if (error.message.includes('limit exceeded')) {
        toast.error('Daily ad view limit reached. Come back tomorrow!');
      } else {
        toast.error(`Failed to record ad view: ${error.message}`);
      }
    },
  });
}

export function useWatchAdFromCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, videoId }: { campaignId: CampaignId; videoId: VideoId }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.watchAdFromCampaign(campaignId, videoId);
    },
    onSuccess: (reward) => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['adViewHistory'] });
      queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['advertiserCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['allCampaigns'] });
      const rewardAmount = `$${(Number(reward) / 100000000).toFixed(2)}`;
      toast.success(`Ad reward earned: ${rewardAmount}!`);
    },
    onError: (error: Error) => {
      if (error.message.includes('limit exceeded')) {
        toast.error('Daily ad view limit reached. Come back tomorrow!');
      } else if (error.message.includes('insufficient budget')) {
        toast.error('Campaign has insufficient budget');
      } else {
        toast.error(`Failed to watch ad: ${error.message}`);
      }
    },
  });
}

export function useGetAdViewHistory() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<{ totalViews: bigint; dailyViews: bigint }>({
    queryKey: ['adViewHistory', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getAdViewHistory(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetAdRewardHistory() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<AdRewardHistory[]>({
    queryKey: ['adRewardHistory', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getAdRewardHistory(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetAdRewardRate() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['adRewardRate'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAdRewardRate();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetAdRewardRate() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setAdRewardRate(rate);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adRewardRate'] });
      toast.success('Ad reward rate updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ad reward rate: ${error.message}`);
    },
  });
}

export function useGetMaxAdViewsPerDay() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['maxAdViewsPerDay'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMaxAdViewsPerDay();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetMaxAdViewsPerDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (limit: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setMaxAdViewsPerDay(limit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maxAdViewsPerDay'] });
      toast.success('Daily ad view limit updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ad view limit: ${error.message}`);
    },
  });
}

export function useGetRewardHistory() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<RewardHistory>({
    queryKey: ['rewardHistory', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getRewardHistory(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['isAdmin', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isAdmin();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useHasAdminOverride() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<boolean>({
    queryKey: ['hasAdminOverride', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasAdminOverride();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetCallerUserRole() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserRole>({
    queryKey: ['userRole', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserRole();
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useAssignCallerUserRole() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ user, role }: { user: Principal; role: UserRole }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.assignCallerUserRole(user, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['isAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['userRole'] });
      toast.success('Admin role granted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to grant admin role: ${error.message}`);
    },
  });
}

export function useIsStripeConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['stripeConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetStripeConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ secretKey, allowedCountries }: { secretKey: string; allowedCountries: string[] }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setStripeConfiguration({ secretKey, allowedCountries });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stripeConfigured'] });
      toast.success('Stripe configured successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to configure Stripe: ${error.message}`);
    },
  });
}

// PayPal Configuration Hooks
export function useIsPayPalConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['paypalConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isPayPalConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetPayPalConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId, secret }: { clientId: string; secret: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setPayPalConfiguration({ clientId, secret });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paypalConfigured'] });
      toast.success('PayPal configured successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to configure PayPal: ${error.message}`);
    },
  });
}

// Payout Request Hooks
export function useCreatePayoutRequest() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ amount, provider }: { amount: bigint; provider: PayoutProvider }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createPayoutRequest(amount, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPayoutRequests'] });
      toast.success('Payout request submitted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create payout request: ${error.message}`);
    },
  });
}

export function useGetUserPayoutRequests() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<PayoutRequest[]>({
    queryKey: ['userPayoutRequests', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      return actor.getUserPayoutRequests(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetAllPayoutRequests() {
  const { actor, isFetching } = useActor();

  return useQuery<PayoutRequest[]>({
    queryKey: ['allPayoutRequests'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllPayoutRequests();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdatePayoutRequestStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: AdminPayoutUpdateRequest) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updatePayoutRequestStatus(update);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allPayoutRequests'] });
      queryClient.invalidateQueries({ queryKey: ['userPayoutRequests'] });
      toast.success('Payout status updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update payout status: ${error.message}`);
    },
  });
}

// Advertiser Campaign Hooks
export function useCreateAdCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      description,
      adVideoBlob,
      targetTags,
      initialBudget,
      payoutPerView,
    }: {
      title: string;
      description: string;
      adVideoBlob: ExternalBlob;
      targetTags: string[];
      initialBudget: bigint;
      payoutPerView: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.createAdCampaign(title, description, adVideoBlob, targetTags, initialBudget, payoutPerView);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertiserCampaigns'] });
      toast.success('Ad campaign created! Awaiting admin approval.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });
}

export function useGetAdvertiserCampaigns() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<AdCampaign[]>({
    queryKey: ['advertiserCampaigns', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) return [];
      return actor.getAdvertiserCampaigns(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetActiveCampaigns() {
  const { actor, isFetching } = useActor();

  return useQuery<AdCampaign[]>({
    queryKey: ['activeCampaigns'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getActiveCampaigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllCampaignsForAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<AdCampaign[]>({
    queryKey: ['allCampaigns'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllCampaignsForAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useApproveAdCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: CampaignId) => {
      if (!actor) throw new Error('Actor not available');
      await actor.approveAdCampaign(campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['activeCampaigns'] });
      toast.success('Campaign approved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve campaign: ${error.message}`);
    },
  });
}

export function useRejectAdCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: CampaignId) => {
      if (!actor) throw new Error('Actor not available');
      await actor.rejectAdCampaign(campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allCampaigns'] });
      toast.success('Campaign rejected');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject campaign: ${error.message}`);
    },
  });
}

export function useAddBudgetToCampaign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ campaignId, amount }: { campaignId: CampaignId; amount: bigint }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addBudgetToCampaign(campaignId, amount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertiserCampaigns'] });
      toast.success('Budget added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add budget: ${error.message}`);
    },
  });
}

export function useRequestCampaignApproval() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: CampaignId) => {
      if (!actor) throw new Error('Actor not available');
      await actor.requestCampaignApproval(campaignId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advertiserCampaigns'] });
      toast.success('Campaign submitted for approval');
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit campaign: ${error.message}`);
    },
  });
}

// YouTube Integration Hooks
export function useGetYoutubeChannels() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['youtubeChannels'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getYoutubeChannels();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetFeaturedYoutubeVideos() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['featuredYoutubeVideos'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeaturedYoutubeVideos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddYoutubeChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelUrl: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addYoutubeChannel(channelUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeChannels'] });
      toast.success('YouTube channel added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add YouTube channel: ${error.message}`);
    },
  });
}

export function useRemoveYoutubeChannel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (channelUrl: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.removeYoutubeChannel(channelUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['youtubeChannels'] });
      toast.success('YouTube channel removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove YouTube channel: ${error.message}`);
    },
  });
}

export function useAddFeaturedYoutubeVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoUrl: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.addFeaturedYoutubeVideo(videoUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featuredYoutubeVideos'] });
      toast.success('Featured YouTube video added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add featured video: ${error.message}`);
    },
  });
}

export function useRemoveFeaturedYoutubeVideo() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (videoUrl: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.removeFeaturedYoutubeVideo(videoUrl);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featuredYoutubeVideos'] });
      toast.success('Featured YouTube video removed successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove featured video: ${error.message}`);
    },
  });
}

export function useGetMaxAdsPerYoutubeSession() {
  const { actor, isFetching } = useActor();

  return useQuery<bigint>({
    queryKey: ['maxAdsPerYoutubeSession'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getMaxAdsPerYoutubeSession();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetMaxAdsPerYoutubeSession() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (limit: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setMaxAdsPerYoutubeSession(limit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maxAdsPerYoutubeSession'] });
      toast.success('Max ads per YouTube session updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update max ads per session: ${error.message}`);
    },
  });
}

// Featured YouTube Playlist Hooks
export function useGetFeaturedYoutubePlaylistId() {
  const { actor, isFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ['featuredYoutubePlaylistId'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getFeaturedYoutubePlaylistId();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetFeaturedYoutubePlaylistId() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (playlistId: string) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setFeaturedYoutubePlaylistId(playlistId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featuredYoutubePlaylistId'] });
      toast.success('Featured YouTube playlist updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update featured playlist: ${error.message}`);
    },
  });
}

export function useGetFeaturedYoutubePlaylistVideos() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ['featuredYoutubePlaylistVideos'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getFeaturedYoutubePlaylistVideos();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useClearFeaturedYoutubePlaylist() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not available');
      await actor.clearFeaturedYoutubePlaylist();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featuredYoutubePlaylistId'] });
      queryClient.invalidateQueries({ queryKey: ['featuredYoutubePlaylistVideos'] });
      toast.success('Featured YouTube playlist cleared successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear featured playlist: ${error.message}`);
    },
  });
}

// AdMob Configuration Hooks
export function useGetAdMobConfiguration() {
  const { actor, isFetching } = useActor();

  return useQuery<AdMobConfig | null>({
    queryKey: ['adMobConfiguration'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getAdMobConfiguration();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetAdMobConfiguration() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: AdMobConfig) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setAdMobConfiguration(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adMobConfiguration'] });
      toast.success('AdMob configuration saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save AdMob configuration: ${error.message}`);
    },
  });
}

// Bandwidth Earnings Hooks
export function useIsBandwidthEarningsConfigured() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['bandwidthConfigured'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isBandwidthEarningsConfigured();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSetBandwidthEarningsConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (config: BandwidthEarningsConfig) => {
      if (!actor) throw new Error('Actor not available');
      await actor.setBandwidthEarningsConfig(config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bandwidthConfigured'] });
      toast.success('Bandwidth earnings configured successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to configure bandwidth earnings: ${error.message}`);
    },
  });
}

export function useGetBandwidthEarnings() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<UserBandwidthEarnings>({
    queryKey: ['bandwidthEarnings', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getBandwidthEarnings(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
  });
}

export function useGetBandwidthEarningsDashboard() {
  const { actor, isFetching } = useActor();
  const { identity } = useInternetIdentity();

  return useQuery<BandwidthEarningsDashboard>({
    queryKey: ['bandwidthDashboard', identity?.getPrincipal().toString()],
    queryFn: async () => {
      if (!actor || !identity) throw new Error('Not authenticated');
      return actor.getBandwidthEarningsDashboard(identity.getPrincipal());
    },
    enabled: !!actor && !isFetching && !!identity,
    refetchInterval: 5000,
  });
}

export function useRecordBandwidthUsage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bandwidthMb, connectionId }: { bandwidthMb: bigint; connectionId: string }) => {
      if (!actor) throw new Error('Actor not available');
      await actor.recordBandwidthUsage(bandwidthMb, connectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bandwidthEarnings'] });
      queryClient.invalidateQueries({ queryKey: ['bandwidthDashboard'] });
    },
  });
}

export function useUpdateBandwidthEarnings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (earningsUsd: bigint) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateBandwidthEarnings(earningsUsd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bandwidthEarnings'] });
      queryClient.invalidateQueries({ queryKey: ['bandwidthDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useUpdateConnectionStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (status: T) => {
      if (!actor) throw new Error('Actor not available');
      await actor.updateConnectionStatus(status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bandwidthEarnings'] });
      queryClient.invalidateQueries({ queryKey: ['bandwidthDashboard'] });
    },
  });
}
