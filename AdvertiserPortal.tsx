import { useState } from 'react';
import { useCreateAdCampaign, useGetAdvertiserCampaigns, useAddBudgetToCampaign, useRequestCampaignApproval } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Megaphone, Plus, DollarSign, Target, TrendingUp, Eye, Loader2, Upload as UploadIcon, CheckCircle, XCircle, Clock } from 'lucide-react';
import { ExternalBlob } from '../backend';
import type { AdCampaign } from '../backend';

export default function AdvertiserPortal() {
  const { data: campaigns, isLoading } = useGetAdvertiserCampaigns();
  const createCampaign = useCreateAdCampaign();
  const addBudget = useAddBudgetToCampaign();
  const requestApproval = useRequestCampaignApproval();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetTags, setTargetTags] = useState('');
  const [budget, setBudget] = useState('');
  const [payoutPerView, setPayoutPerView] = useState('');
  const [adVideoFile, setAdVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [additionalBudget, setAdditionalBudget] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAdVideoFile(e.target.files[0]);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adVideoFile) {
      return;
    }

    try {
      const arrayBuffer = await adVideoFile.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      const budgetInE8s = BigInt(Math.round(parseFloat(budget) * 100000000));
      const payoutInE8s = BigInt(Math.round(parseFloat(payoutPerView) * 100000000));

      await createCampaign.mutateAsync({
        title,
        description,
        adVideoBlob: blob,
        targetTags: targetTags.split(',').map((t) => t.trim()).filter((t) => t),
        initialBudget: budgetInE8s,
        payoutPerView: payoutInE8s,
      });

      setShowCreateDialog(false);
      setTitle('');
      setDescription('');
      setTargetTags('');
      setBudget('');
      setPayoutPerView('');
      setAdVideoFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Failed to create campaign:', error);
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    const amountInE8s = BigInt(Math.round(parseFloat(additionalBudget) * 100000000));
    await addBudget.mutateAsync({
      campaignId: selectedCampaign.id,
      amount: amountInE8s,
    });

    setShowBudgetDialog(false);
    setSelectedCampaign(null);
    setAdditionalBudget('');
  };

  const handleRequestApproval = async (campaignId: string) => {
    await requestApproval.mutateAsync(campaignId);
  };

  const formatCurrency = (amount: bigint) => {
    return `$${(Number(amount) / 100000000).toFixed(2)}`;
  };

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'pendingReview':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const activeCampaigns = campaigns?.filter((c) => c.status === 'active') || [];
  const pendingCampaigns = campaigns?.filter((c) => c.status === 'pendingReview') || [];
  const totalSpend = campaigns?.reduce((sum, c) => sum + Number(c.spend), 0) || 0;
  const totalViews = campaigns?.reduce((sum, c) => sum + Number(c.views), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <img src="/assets/generated/advertiser-icon-transparent.dim_64x64.png" alt="Advertiser" className="h-8 w-8" />
            Advertiser Portal
          </h2>
          <p className="text-muted-foreground">Create and manage your ad campaigns</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Ad Campaign</DialogTitle>
              <DialogDescription>
                Upload your ad video and configure campaign settings
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Campaign Title</Label>
                <Input
                  id="title"
                  placeholder="Summer Sale 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your ad campaign..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adVideo">Ad Video</Label>
                <Input
                  id="adVideo"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  required
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <Progress value={uploadProgress} className="h-2" />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetTags">Target Tags (comma-separated)</Label>
                <Input
                  id="targetTags"
                  placeholder="gaming, tech, lifestyle"
                  value={targetTags}
                  onChange={(e) => setTargetTags(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget">Initial Budget (ICP)</Label>
                  <Input
                    id="budget"
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payout">Payout Per View (ICP)</Label>
                  <Input
                    id="payout"
                    type="number"
                    step="0.01"
                    placeholder="0.10"
                    value={payoutPerView}
                    onChange={(e) => setPayoutPerView(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createCampaign.isPending || !adVideoFile}>
                {createCampaign.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <UploadIcon className="mr-2 h-4 w-4" />
                    Create Campaign
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <img src="/assets/generated/campaign-icon-transparent.dim_64x64.png" alt="Campaigns" className="h-4 w-4" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalSpend / 100000000).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {campaigns && campaigns.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      {campaign.title}
                      {getCampaignStatusBadge(campaign.status)}
                    </CardTitle>
                    <CardDescription className="mt-2">{campaign.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {campaign.targetTags.map((tag, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1">
                      <Target className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Budget Remaining</span>
                    <span className="font-medium">{formatCurrency(campaign.budget)}</span>
                  </div>
                  <Progress 
                    value={campaign.budget > 0n ? ((Number(campaign.spend) / (Number(campaign.spend) + Number(campaign.budget))) * 100) : 100} 
                    className="h-2" 
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Spent: {formatCurrency(campaign.spend)}</span>
                    <span>Views: {Number(campaign.views)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Payout/View</p>
                    <p className="text-sm font-medium">{formatCurrency(campaign.payoutPerView)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {Number(campaign.views)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  {campaign.status === 'draft' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRequestApproval(campaign.id)}
                      disabled={requestApproval.isPending}
                    >
                      {requestApproval.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Submit for Approval'
                      )}
                    </Button>
                  )}
                  {(campaign.status === 'active' || campaign.status === 'pendingReview') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        setSelectedCampaign(campaign);
                        setShowBudgetDialog(true);
                      }}
                    >
                      <img src="/assets/generated/budget-icon-transparent.dim_64x64.png" alt="Budget" className="h-4 w-4" />
                      Add Budget
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mb-4">Create your first ad campaign to get started</p>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Budget</DialogTitle>
            <DialogDescription>
              Add more budget to your campaign: {selectedCampaign?.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBudget} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="additionalBudget">Additional Budget (ICP)</Label>
              <Input
                id="additionalBudget"
                type="number"
                step="0.01"
                placeholder="5.00"
                value={additionalBudget}
                onChange={(e) => setAdditionalBudget(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Current budget: {selectedCampaign ? formatCurrency(selectedCampaign.budget) : '$0.00'}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={addBudget.isPending}>
              {addBudget.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Budget...
                </>
              ) : (
                'Add Budget'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
