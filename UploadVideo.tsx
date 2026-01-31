import { useState } from 'react';
import { useUploadVideo, useGetCreatedVideos } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, Video, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { ExternalBlob } from '../backend';
import type { VideoMonetizationType } from '../backend';

export default function UploadVideo() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [monetizationType, setMonetizationType] = useState<'adSupported' | 'subscription' | 'payPerView'>('adSupported');
  const [price, setPrice] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const uploadVideo = useUploadVideo();
  const { data: createdVideos, isLoading: loadingVideos } = useGetCreatedVideos();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) return;

      const arrayBuffer = event.target.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      let monetization: VideoMonetizationType;
      if (monetizationType === 'adSupported') {
        monetization = { __kind__: 'adSupported', adSupported: null };
      } else if (monetizationType === 'subscription') {
        monetization = { __kind__: 'subscription', subscription: { price: BigInt(Math.round(parseFloat(price) * 100)) } };
      } else {
        monetization = { __kind__: 'payPerView', payPerView: { price: BigInt(Math.round(parseFloat(price) * 100)) } };
      }

      const priceValue = monetizationType === 'adSupported' ? null : BigInt(Math.round(parseFloat(price) * 100));

      await uploadVideo.mutateAsync({
        title,
        description,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        videoBlob: blob,
        monetizationType: monetization,
        price: priceValue,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setTags('');
      setPrice('');
      setVideoFile(null);
      setUploadProgress(0);
      setMonetizationType('adSupported');
    };

    reader.readAsArrayBuffer(videoFile);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending Review</Badge>;
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Upload Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload New Video
          </CardTitle>
          <CardDescription>
            Share your content and start earning through multiple monetization options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your video"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                placeholder="e.g., tutorial, gaming, vlog"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="monetization">Monetization Type</Label>
              <Select value={monetizationType} onValueChange={(value: any) => setMonetizationType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="adSupported">Free with Ads</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="payPerView">Pay-per-view</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {monetizationType !== 'adSupported' && (
              <div className="space-y-2">
                <Label htmlFor="price">
                  Price (USD) {monetizationType === 'subscription' && '/ month'}
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="video">Video File</Label>
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                required
              />
              {videoFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={uploadVideo.isPending || !videoFile}
            >
              {uploadVideo.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Video
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* My Videos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            My Videos
          </CardTitle>
          <CardDescription>
            Track the status of your uploaded videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingVideos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : createdVideos && createdVideos.length > 0 ? (
            <div className="space-y-4">
              {createdVideos.map((video) => (
                <Card key={video.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold line-clamp-1">{video.title}</h4>
                          {getStatusIcon(video.status)}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {video.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            <span>{Number(video.views)}</span>
                          </div>
                          {getStatusBadge(video.status)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Video className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No videos uploaded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
