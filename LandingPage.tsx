import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Coins, Upload, TrendingUp, Shield, Zap } from 'lucide-react';

export default function LandingPage() {
  const { login, loginStatus } = useInternetIdentity();

  const features = [
    {
      icon: Play,
      title: 'Watch Videos',
      description: 'Browse and watch engaging content from creators worldwide',
    },
    {
      icon: Coins,
      title: 'Earn Rewards',
      description: 'Get rewarded for watching videos and engaging with content',
    },
    {
      icon: Upload,
      title: 'Create Content',
      description: 'Upload your videos and monetize through multiple revenue streams',
    },
    {
      icon: TrendingUp,
      title: 'Multiple Monetization',
      description: 'Choose from ads, subscriptions, or pay-per-view models',
    },
    {
      icon: Shield,
      title: 'Secure Platform',
      description: 'Built on Internet Computer with Internet Identity authentication',
    },
    {
      icon: Zap,
      title: 'Instant Payouts',
      description: 'Request payouts anytime and track your earnings in real-time',
    },
  ];

  return (
    <div className="container py-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-8 mb-16">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Watch Videos, Earn Rewards
          </h1>
          <p className="text-xl text-muted-foreground">
            The revolutionary video platform where viewers earn rewards and creators thrive through flexible monetization
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            size="lg"
            onClick={login}
            disabled={loginStatus === 'logging-in'}
            className="gap-2 text-lg px-8"
          >
            <Play className="h-5 w-5" />
            {loginStatus === 'logging-in' ? 'Connecting...' : 'Get Started'}
          </Button>
          <Button size="lg" variant="outline" className="gap-2 text-lg px-8">
            <Upload className="h-5 w-5" />
            Become a Creator
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 pt-8 w-full max-w-2xl">
          <div className="space-y-2">
            <p className="text-3xl font-bold text-primary">10K+</p>
            <p className="text-sm text-muted-foreground">Active Users</p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-accent">5K+</p>
            <p className="text-sm text-muted-foreground">Videos</p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-primary">$50K+</p>
            <p className="text-sm text-muted-foreground">Rewards Paid</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
        {features.map((feature, index) => (
          <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
                  <feature.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA Section */}
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20">
        <CardContent className="py-12">
          <div className="flex flex-col items-center text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to Start Earning?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Join thousands of users who are already earning rewards by watching videos. Sign up now and start your journey!
            </p>
            <Button
              size="lg"
              onClick={login}
              disabled={loginStatus === 'logging-in'}
              className="gap-2 text-lg px-8"
            >
              <Play className="h-5 w-5" />
              {loginStatus === 'logging-in' ? 'Connecting...' : 'Join Now - It\'s Free'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
