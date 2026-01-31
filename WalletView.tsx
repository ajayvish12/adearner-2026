import { useGetWallet, useGetRewardHistory, useGetAdViewHistory, useGetBandwidthEarnings, useGetUserPayoutRequests, useCreatePayoutRequest } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp, DollarSign, ArrowUpRight, Coins, Eye, Video, CheckCircle2, Clock, XCircle, Wifi } from 'lucide-react';
import { SiPaypal, SiStripe } from 'react-icons/si';
import { useState } from 'react';
import { PayoutProvider, PayoutRequestStatus } from '../backend';

export default function WalletView() {
  const { data: wallet, isLoading: walletLoading } = useGetWallet();
  const { data: rewardHistory, isLoading: historyLoading } = useGetRewardHistory();
  const { data: adViewHistory, isLoading: adViewLoading } = useGetAdViewHistory();
  const { data: bandwidthEarnings, isLoading: bandwidthLoading } = useGetBandwidthEarnings();
  const { data: payoutRequests, isLoading: payoutsLoading } = useGetUserPayoutRequests();

  const createPayoutRequest = useCreatePayoutRequest();

  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PayoutProvider>(PayoutProvider.paypal);

  const formatCurrency = (amount: bigint) => {
    return `$${(Number(amount) / 100000000).toFixed(2)}`;
  };

  const handlePayoutRequest = async () => {
    if (!wallet || wallet.balance === 0n) {
      return;
    }

    await createPayoutRequest.mutateAsync({
      amount: wallet.balance,
      provider: selectedProvider,
    });
    
    setShowPayoutDialog(false);
  };

  const getStatusIcon = (status: PayoutRequestStatus) => {
    switch (status) {
      case PayoutRequestStatus.confirmed:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case PayoutRequestStatus.processing:
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case PayoutRequestStatus.failed:
      case PayoutRequestStatus.cancelled:
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
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

  if (walletLoading || historyLoading || adViewLoading || bandwidthLoading || payoutsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const adEarnings = wallet?.adEarnings || 0n;
  const bandwidthEarningsAmount = wallet?.bandwidthEarnings || 0n;
  const totalAdViews = Number(adViewHistory?.totalViews || 0n);
  const dailyAdViews = Number(adViewHistory?.dailyViews || 0n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">My Wallet</h2>
          <p className="text-muted-foreground">Track your earnings and request payouts</p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-4xl font-bold">{wallet ? formatCurrency(wallet.balance) : '$0.00'}</p>
              <p className="text-sm text-muted-foreground">
                Last updated: {wallet ? new Date(Number(wallet.lastUpdated) / 1000000).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <img src="/assets/generated/wallet-icon-transparent.dim_64x64.png" alt="Wallet" className="h-12 w-12" />
            </div>
          </div>
          <div className="mt-6">
            <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
              <DialogTrigger asChild>
                <Button className="w-full gap-2" size="lg" disabled={!wallet || wallet.balance === 0n}>
                  <ArrowUpRight className="h-5 w-5" />
                  Request Payout
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                  <DialogDescription>
                    Choose your preferred payout method to withdraw your earnings
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label>Payout Amount</Label>
                    <div className="text-3xl font-bold text-primary">
                      {wallet ? formatCurrency(wallet.balance) : '$0.00'}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label>Select Payout Method</Label>
                    <RadioGroup value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as PayoutProvider)}>
                      <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer">
                        <RadioGroupItem value={PayoutProvider.paypal} id="paypal" />
                        <Label htmlFor="paypal" className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0070ba]">
                            <SiPaypal className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">PayPal</p>
                            <p className="text-sm text-muted-foreground">1-3 business days</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer">
                        <RadioGroupItem value={PayoutProvider.stripe} id="stripe" />
                        <Label htmlFor="stripe" className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#635bff]">
                            <SiStripe className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">Stripe</p>
                            <p className="text-sm text-muted-foreground">2-5 business days</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={handlePayoutRequest}
                    disabled={createPayoutRequest.isPending}
                  >
                    {createPayoutRequest.isPending ? (
                      <>
                        <Clock className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="h-5 w-5" />
                        Confirm Payout via {selectedProvider === PayoutProvider.paypal ? 'PayPal' : 'Stripe'}
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallet ? formatCurrency(wallet.totalEarned) : '$0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">All-time earnings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wallet ? formatCurrency(wallet.totalSpent) : '$0.00'}</div>
            <p className="text-xs text-muted-foreground mt-1">On premium content</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reward Count</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rewardHistory ? Number(rewardHistory.rewardCount) : 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Videos watched</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-accent/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <img src="/assets/generated/ad-earnings-coins-transparent.dim_128x128.png" alt="Ad Earnings" className="h-8 w-8" />
            <div>
              <CardTitle>Ad-Based Earnings</CardTitle>
              <CardDescription>Rewards from watching ad-supported videos</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                  <Coins className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Total Ad Earnings</p>
                  <p className="text-sm text-muted-foreground">Lifetime ad rewards</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-primary">{formatCurrency(adEarnings)}</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Total Ad Views</p>
                  <p className="text-sm text-muted-foreground">All-time ad-supported videos watched</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{totalAdViews}</p>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Video className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Today's Ad Views</p>
                  <p className="text-sm text-muted-foreground">Videos watched today</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{dailyAdViews}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <img src="/assets/generated/bandwidth-sharing-icon-transparent.dim_64x64.png" alt="Bandwidth" className="h-8 w-8" />
            <div>
              <CardTitle>Bandwidth Earnings</CardTitle>
              <CardDescription>Real earnings from sharing unused internet bandwidth</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Wifi className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Total Bandwidth Earnings</p>
                  <p className="text-sm text-muted-foreground">Real USD from bandwidth sharing</p>
                </div>
              </div>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(bandwidthEarningsAmount)}</p>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Total Bandwidth Shared</p>
                  <p className="text-sm text-muted-foreground">Data contributed to network</p>
                </div>
              </div>
              <p className="text-2xl font-bold">{bandwidthEarnings ? Number(bandwidthEarnings.totalBandwidthSharedMb) : 0} MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>My Payout Requests</CardTitle>
          <CardDescription>Your withdrawal transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          {payoutRequests && payoutRequests.length > 0 ? (
            <div className="space-y-3">
              {payoutRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      {request.provider === PayoutProvider.paypal ? (
                        <SiPaypal className="h-6 w-6 text-[#0070ba]" />
                      ) : (
                        <SiStripe className="h-6 w-6 text-[#635bff]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {request.provider === PayoutProvider.paypal ? 'PayPal' : 'Stripe'} Payout
                        </p>
                        {getStatusIcon(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(Number(request.createdAt) / 1000000).toLocaleDateString()} at {new Date(Number(request.createdAt) / 1000000).toLocaleTimeString()}
                      </p>
                      {request.status === PayoutRequestStatus.confirmed && (
                        <p className="text-xs text-green-600 mt-1">Payout completed successfully</p>
                      )}
                      {request.status === PayoutRequestStatus.failed && (
                        <p className="text-xs text-red-600 mt-1">Payout failed - please contact support</p>
                      )}
                      {request.status === PayoutRequestStatus.cancelled && (
                        <p className="text-xs text-red-600 mt-1">Payout cancelled by admin</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(request.amount)}</p>
                    {getStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ArrowUpRight className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No payout requests yet</p>
              <p className="text-sm text-muted-foreground mt-1">Request your first payout to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Earning Statistics</CardTitle>
          <CardDescription>Your content performance overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Videos Created</p>
                <p className="text-sm text-muted-foreground">Total videos uploaded</p>
              </div>
              <p className="text-2xl font-bold">{rewardHistory ? Number(rewardHistory.videoCount) : 0}</p>
            </div>
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Subscriptions</p>
                <p className="text-sm text-muted-foreground">Active subscribers</p>
              </div>
              <p className="text-2xl font-bold">{rewardHistory ? Number(rewardHistory.subscriptionCount) : 0}</p>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Premium Earnings</p>
                <p className="text-sm text-muted-foreground">From subscriptions & PPV</p>
              </div>
              <p className="text-2xl font-bold">
                {rewardHistory ? formatCurrency(rewardHistory.totalPremiumEarnings) : '$0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
