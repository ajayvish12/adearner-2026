import { useState, useEffect } from 'react';
import { useGetBandwidthEarningsDashboard, useUpdateConnectionStatus, useRecordBandwidthUsage, useUpdateBandwidthEarnings, useGetUserPayoutRequests, useCreatePayoutRequest } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Wifi, WifiOff, Activity, DollarSign, HardDrive, TrendingUp, CheckCircle2, Pause, Shield, Clock, XCircle, Zap, Server, Globe } from 'lucide-react';
import { SiPaypal, SiStripe } from 'react-icons/si';
import { T, PayoutProvider, PayoutRequestStatus } from '../backend';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function BandwidthEarnings() {
  const { data: dashboard, isLoading } = useGetBandwidthEarningsDashboard();
  const updateConnectionStatus = useUpdateConnectionStatus();
  const recordBandwidthUsage = useRecordBandwidthUsage();
  const updateBandwidthEarnings = useUpdateBandwidthEarnings();
  const { data: payoutRequests, isLoading: payoutsLoading } = useGetUserPayoutRequests();
  const createPayoutRequest = useCreatePayoutRequest();

  const [isActive, setIsActive] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [sessionBandwidth, setSessionBandwidth] = useState(0);
  const [connectionUptime, setConnectionUptime] = useState(0);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PayoutProvider>(PayoutProvider.paypal);

  // Mock data for charts
  const [dailyData, setDailyData] = useState([
    { day: 'Mon', earnings: 0.12 },
    { day: 'Tue', earnings: 0.18 },
    { day: 'Wed', earnings: 0.15 },
    { day: 'Thu', earnings: 0.22 },
    { day: 'Fri', earnings: 0.19 },
    { day: 'Sat', earnings: 0.25 },
    { day: 'Sun', earnings: 0.21 },
  ]);

  const [weeklyData, setWeeklyData] = useState([
    { week: 'Week 1', earnings: 1.2 },
    { week: 'Week 2', earnings: 1.5 },
    { week: 'Week 3', earnings: 1.8 },
    { week: 'Week 4', earnings: 2.1 },
  ]);

  const [monthlyData, setMonthlyData] = useState([
    { month: 'Jan', earnings: 4.5 },
    { month: 'Feb', earnings: 5.2 },
    { month: 'Mar', earnings: 6.1 },
    { month: 'Apr', earnings: 5.8 },
    { month: 'May', earnings: 7.2 },
    { month: 'Jun', earnings: 8.5 },
  ]);

  useEffect(() => {
    if (dashboard) {
      setIsActive(dashboard.currentConnectionStatus === T.active);
    }
  }, [dashboard]);

  useEffect(() => {
    if (!isActive) {
      setConnectionUptime(0);
      return;
    }

    const uptimeInterval = setInterval(() => {
      setConnectionUptime((prev) => prev + 1);
    }, 1000);

    const bandwidthInterval = setInterval(() => {
      const randomSpeed = Math.floor(Math.random() * 50) + 10;
      const bandwidthMb = Math.floor(randomSpeed / 12);
      const earningsPerMb = 0.00015;
      const earnings = bandwidthMb * earningsPerMb;

      setCurrentSpeed(randomSpeed);
      setSessionBandwidth((prev) => prev + bandwidthMb);
      setSessionEarnings((prev) => prev + earnings);

      if (bandwidthMb > 0) {
        recordBandwidthUsage.mutate({
          bandwidthMb: BigInt(bandwidthMb),
          connectionId: `conn_${Date.now()}`,
        });

        const earningsInCents = Math.floor(earnings * 100000000);
        if (earningsInCents > 0) {
          updateBandwidthEarnings.mutate(BigInt(earningsInCents));
        }
      }
    }, 5000);

    return () => {
      clearInterval(uptimeInterval);
      clearInterval(bandwidthInterval);
    };
  }, [isActive]);

  const handleToggleConnection = async () => {
    const newStatus = isActive ? T.paused : T.active;
    
    try {
      await updateConnectionStatus.mutateAsync(newStatus);
      setIsActive(!isActive);
      
      if (!isActive) {
        setSessionEarnings(0);
        setSessionBandwidth(0);
        setConnectionUptime(0);
        toast.success('🚀 Bandwidth sharing activated!');
      } else {
        toast.info('⏸️ Bandwidth sharing paused');
      }
    } catch (error) {
      toast.error('Failed to update connection status');
    }
  };

  const handlePayoutRequest = async () => {
    if (!dashboard || dashboard.currentBalance === 0n) {
      toast.error('Insufficient balance for withdrawal');
      return;
    }

    const minThreshold = BigInt(500000000);
    if (dashboard.currentBalance < minThreshold) {
      toast.error('Minimum withdrawal amount is $5.00');
      return;
    }

    await createPayoutRequest.mutateAsync({
      amount: dashboard.currentBalance,
      provider: selectedProvider,
    });
    
    setShowPayoutDialog(false);
  };

  const formatCurrency = (amount: bigint | number) => {
    const value = typeof amount === 'bigint' ? Number(amount) / 100000000 : amount;
    return `$${value.toFixed(2)}`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status: T) => {
    switch (status) {
      case T.active:
        return 'text-emerald-500';
      case T.paused:
        return 'text-amber-500';
      case T.disconnected:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: T) => {
    switch (status) {
      case T.active:
        return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case T.paused:
        return <Pause className="h-5 w-5 text-amber-500" />;
      case T.disconnected:
        return <WifiOff className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPayoutStatusBadge = (status: PayoutRequestStatus) => {
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

  if (isLoading || payoutsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const minWithdrawalThreshold = BigInt(500000000);
  const canWithdraw = dashboard && dashboard.currentBalance >= minWithdrawalThreshold;
  const reliabilityScore = dashboard ? Number(dashboard.reliabilityScore) : 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent">
            Bandwidth Earnings Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">Share your unused internet and earn real money</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusIcon(dashboard?.currentConnectionStatus || T.disconnected)}
          <div className="text-right">
            <p className="text-sm font-medium capitalize">{dashboard?.currentConnectionStatus || 'Disconnected'}</p>
            <p className="text-xs text-muted-foreground">Connection Status</p>
          </div>
        </div>
      </div>

      {/* Statistics Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Earnings</CardTitle>
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {dashboard ? formatCurrency(dashboard.totalEarnings) : '$0.00'}
            </div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 dark:border-cyan-900 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Current Balance</CardTitle>
            <TrendingUp className="h-5 w-5 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-700 dark:text-cyan-400">
              {dashboard ? formatCurrency(dashboard.currentBalance) : '$0.00'}
            </div>
            <p className="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">Available to withdraw</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Bandwidth Shared</CardTitle>
            <HardDrive className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {dashboard ? (Number(dashboard.totalBandwidth) / 1024).toFixed(2) : '0.00'} GB
            </div>
            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">Total data shared</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 dark:border-teal-900 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-teal-700 dark:text-teal-400">Devices Connected</CardTitle>
            <Server className="h-5 w-5 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-teal-700 dark:text-teal-400">1</div>
            <p className="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">Active device</p>
          </CardContent>
        </Card>
      </div>

      {/* Uptime and Reliability */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-emerald-600" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-emerald-600">{formatUptime(connectionUptime)}</div>
            <p className="text-sm text-muted-foreground mt-2">Current session uptime</p>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 dark:border-cyan-900">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600" />
              Reliability Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-4xl font-bold text-cyan-600">{reliabilityScore}%</div>
              <Progress value={reliabilityScore} className="h-3 bg-cyan-100 dark:bg-cyan-950" />
              <p className="text-sm text-muted-foreground">Connection quality rating</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bandwidth Gauge and Live Status */}
      <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-cyan-50/50 dark:from-emerald-950/20 dark:to-cyan-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Live Connection Monitor</CardTitle>
              <CardDescription>Real-time bandwidth sharing activity</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground">Sharing Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-sm font-semibold">{isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={handleToggleConnection}
                disabled={updateConnectionStatus.isPending}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isActive ? (
            <div className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-6 rounded-lg bg-white/50 dark:bg-gray-900/50 border border-emerald-200 dark:border-emerald-900">
                  <Activity className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-emerald-600">{currentSpeed} Mbps</p>
                  <p className="text-sm text-muted-foreground mt-1">Current Speed</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-white/50 dark:bg-gray-900/50 border border-cyan-200 dark:border-cyan-900">
                  <HardDrive className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-cyan-600">{sessionBandwidth} MB</p>
                  <p className="text-sm text-muted-foreground mt-1">Session Data</p>
                </div>
                <div className="text-center p-6 rounded-lg bg-white/50 dark:bg-gray-900/50 border border-blue-200 dark:border-blue-900">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(sessionEarnings)}</p>
                  <p className="text-sm text-muted-foreground mt-1">Session Earnings</p>
                </div>
              </div>
              <div className="relative">
                <Progress value={(currentSpeed / 60) * 100} className="h-4 bg-emerald-100 dark:bg-emerald-950" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {Math.round((currentSpeed / 60) * 100)}% of max speed
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <WifiOff className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Not sharing bandwidth</p>
              <p className="text-sm text-muted-foreground mt-2">Toggle the switch above to start earning</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="text-lg">Daily Earnings</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #10b981',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                />
                <Line type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-cyan-200 dark:border-cyan-900">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Earnings</CardTitle>
            <CardDescription>Last 4 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #06b6d4',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                />
                <Bar dataKey="earnings" fill="#06b6d4" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #3b82f6',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Earnings']}
                />
                <Area type="monotone" dataKey="earnings" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Start/Stop Toggle Button */}
      <Card className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                {isActive ? <Wifi className="h-8 w-8 text-white" /> : <WifiOff className="h-8 w-8 text-white" />}
              </div>
              <div>
                <h3 className="text-xl font-bold">{isActive ? 'Sharing Active' : 'Start Sharing'}</h3>
                <p className="text-sm text-muted-foreground">
                  {isActive ? 'Your bandwidth is being shared and earning money' : 'Toggle to start earning from your unused bandwidth'}
                </p>
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleToggleConnection}
              disabled={updateConnectionStatus.isPending}
              className={`px-8 ${isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {isActive ? (
                <>
                  <Pause className="h-5 w-5 mr-2" />
                  Stop Sharing
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Start Sharing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Timeline */}
      <Card className="border-cyan-200 dark:border-cyan-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Withdrawal History</CardTitle>
              <CardDescription>Track your payout requests and status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {payoutRequests && payoutRequests.length > 0 ? (
            <div className="space-y-6">
              {payoutRequests
                .sort((a, b) => Number(b.createdAt - a.createdAt))
                .map((request, index) => (
                  <div key={request.id} className="relative">
                    {index !== payoutRequests.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-emerald-200 to-cyan-200 dark:from-emerald-900 dark:to-cyan-900" />
                    )}
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        request.status === PayoutRequestStatus.confirmed ? 'bg-emerald-100 dark:bg-emerald-900' :
                        request.status === PayoutRequestStatus.processing ? 'bg-amber-100 dark:bg-amber-900' :
                        request.status === PayoutRequestStatus.failed || request.status === PayoutRequestStatus.cancelled ? 'bg-red-100 dark:bg-red-900' :
                        'bg-gray-100 dark:bg-gray-900'
                      }`}>
                        {request.provider === PayoutProvider.paypal ? (
                          <SiPaypal className="h-6 w-6 text-[#0070ba]" />
                        ) : (
                          <SiStripe className="h-6 w-6 text-[#635bff]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4 mb-2">
                          <div>
                            <p className="font-semibold text-lg">
                              {request.provider === PayoutProvider.paypal ? 'PayPal' : 'Stripe'} Withdrawal
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(Number(request.createdAt) / 1000000).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(request.amount)}</p>
                            {getPayoutStatusBadge(request.status)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          {request.status === PayoutRequestStatus.pending && (
                            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                              <Clock className="h-4 w-4 text-amber-600" />
                              <AlertDescription className="text-amber-700 dark:text-amber-400">
                                Pending admin approval
                              </AlertDescription>
                            </Alert>
                          )}
                          {request.status === PayoutRequestStatus.processing && (
                            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
                              <Activity className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-700 dark:text-blue-400">
                                Processing - funds will arrive soon
                              </AlertDescription>
                            </Alert>
                          )}
                          {request.status === PayoutRequestStatus.confirmed && (
                            <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              <AlertDescription className="text-emerald-700 dark:text-emerald-400">
                                Completed successfully
                              </AlertDescription>
                            </Alert>
                          )}
                          {(request.status === PayoutRequestStatus.failed || request.status === PayoutRequestStatus.cancelled) && (
                            <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <AlertDescription className="text-red-700 dark:text-red-400">
                                {request.status === PayoutRequestStatus.failed ? 'Failed - contact support' : 'Cancelled by admin'}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No withdrawals yet</p>
              <p className="text-sm text-muted-foreground mt-2">Start sharing bandwidth to earn and request your first payout</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fixed Bottom Withdrawal Panel */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-emerald-600 to-cyan-600 border-t border-emerald-700 shadow-2xl z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-white">
                <p className="text-sm font-medium opacity-90">Available Balance</p>
                <p className="text-3xl font-bold">{dashboard ? formatCurrency(dashboard.currentBalance) : '$0.00'}</p>
              </div>
              <Separator orientation="vertical" className="h-12 bg-white/30" />
              <div className="text-white">
                <p className="text-sm font-medium opacity-90">Pending Withdrawals</p>
                <p className="text-2xl font-bold">
                  {payoutRequests?.filter(r => r.status === PayoutRequestStatus.pending || r.status === PayoutRequestStatus.processing).length || 0}
                </p>
              </div>
            </div>
            <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="lg"
                  disabled={!canWithdraw}
                  className="bg-white text-emerald-700 hover:bg-gray-100 font-bold px-8 shadow-lg"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Withdraw Money
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Withdraw Earnings</DialogTitle>
                  <DialogDescription>
                    Choose your payment method to withdraw your bandwidth earnings
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="text-center p-6 rounded-lg bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-950/30 dark:to-cyan-950/30">
                    <p className="text-sm text-muted-foreground mb-2">Withdrawal Amount</p>
                    <p className="text-4xl font-bold text-emerald-600">
                      {dashboard ? formatCurrency(dashboard.currentBalance) : '$0.00'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Minimum: $5.00</p>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Select Payment Method</Label>
                    <RadioGroup value={selectedProvider} onValueChange={(value) => setSelectedProvider(value as PayoutProvider)}>
                      <div className="flex items-center space-x-3 rounded-lg border-2 border-emerald-200 dark:border-emerald-900 p-4 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors">
                        <RadioGroupItem value={PayoutProvider.paypal} id="paypal-withdraw" />
                        <Label htmlFor="paypal-withdraw" className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0070ba]">
                            <SiPaypal className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">PayPal</p>
                            <p className="text-sm text-muted-foreground">1-3 business days</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 rounded-lg border-2 border-cyan-200 dark:border-cyan-900 p-4 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 cursor-pointer transition-colors">
                        <RadioGroupItem value={PayoutProvider.stripe} id="stripe-withdraw" />
                        <Label htmlFor="stripe-withdraw" className="flex items-center gap-3 cursor-pointer flex-1">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#635bff]">
                            <SiStripe className="h-7 w-7 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">Stripe</p>
                            <p className="text-sm text-muted-foreground">2-5 business days</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button 
                    className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700" 
                    size="lg"
                    onClick={handlePayoutRequest}
                    disabled={createPayoutRequest.isPending}
                  >
                    {createPayoutRequest.isPending ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Confirm Withdrawal
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
