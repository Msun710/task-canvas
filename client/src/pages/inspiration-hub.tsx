import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Quote, Video, Music, Image, Heart, RefreshCw, ExternalLink, Play, Trash2, Pencil, Sparkles, Star, MoreHorizontal, Book } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { InspirationQuote, InspirationVideo, InspirationMusic, InspirationImage, InspirationVerse } from "@shared/schema";

const QUOTE_CATEGORIES = ["motivational", "wisdom", "productivity", "success", "mindfulness", "growth", "other"];
const VIDEO_CATEGORIES = ["motivation", "focus", "meditation", "productivity", "learning", "other"];
const MUSIC_TYPES = ["focus", "energetic", "calm", "ambient"];
const IMAGE_CATEGORIES = ["nature", "abstract", "minimalist", "inspirational", "other"];
const VERSE_CATEGORIES = ["faith", "hope", "love", "wisdom", "strength", "peace", "guidance", "encouragement", "other"];
const BIBLE_TRANSLATIONS = ["NIV", "ESV", "KJV", "NKJV", "NLT", "NASB", "MSG", "AMP", "CSB", "Other"];

export default function InspirationHubPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [isAddMusicOpen, setIsAddMusicOpen] = useState(false);
  const [isAddImageOpen, setIsAddImageOpen] = useState(false);
  const [isAddVerseOpen, setIsAddVerseOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<InspirationQuote | null>(null);
  const [editingVerse, setEditingVerse] = useState<InspirationVerse | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: string } | null>(null);
  
  const [newQuote, setNewQuote] = useState({ text: "", author: "", source: "", category: "motivational" });
  const [newVideo, setNewVideo] = useState({ title: "", url: "", platform: "youtube", category: "motivation", notes: "" });
  const [newMusic, setNewMusic] = useState({ title: "", url: "", platform: "spotify", mood: "focus", artist: "", notes: "" });
  const [newImage, setNewImage] = useState({ title: "", imageUrl: "", source: "", category: "nature", usageContext: "background" });
  const [newVerse, setNewVerse] = useState({ book: "", chapter: 1, verseStart: 1, verseEnd: 0, text: "", translation: "NIV", category: "faith", notes: "" });
  
  const { toast } = useToast();

  const { data: dailyQuote } = useQuery<{ daily: any; quote: InspirationQuote | null }>({
    queryKey: ["/api/inspiration/quotes/daily"],
  });

  const { data: quotes = [], isLoading: quotesLoading } = useQuery<InspirationQuote[]>({
    queryKey: ["/api/inspiration/quotes"],
  });

  const { data: videos = [], isLoading: videosLoading } = useQuery<InspirationVideo[]>({
    queryKey: ["/api/inspiration/videos"],
  });

  const { data: music = [], isLoading: musicLoading } = useQuery<InspirationMusic[]>({
    queryKey: ["/api/inspiration/music"],
  });

  const { data: images = [], isLoading: imagesLoading } = useQuery<InspirationImage[]>({
    queryKey: ["/api/inspiration/images"],
  });

  const { data: verses = [], isLoading: versesLoading } = useQuery<InspirationVerse[]>({
    queryKey: ["/api/inspiration/verses"],
  });

  const { data: stats } = useQuery<{ quotesCount: number; videosCount: number; musicCount: number; imagesCount: number; totalViews: number }>({
    queryKey: ["/api/inspiration/stats"],
  });

  const { data: dashboard, isLoading: dashboardLoading } = useQuery<{
    featuredQuotes: InspirationQuote[];
    featuredVideos: InspirationVideo[];
    featuredMusic: InspirationMusic[];
    featuredImages: InspirationImage[];
    defaultPlaylist: any;
    playlistTracks: InspirationMusic[];
  }>({
    queryKey: ["/api/inspiration/dashboard"],
  });

  const refreshDailyQuote = useMutation({
    mutationFn: () => apiRequest("POST", "/api/inspiration/quotes/daily/refresh"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes/daily"] });
      toast({ title: "Quote refreshed" });
    },
  });

  const createQuoteMutation = useMutation({
    mutationFn: (data: typeof newQuote) => apiRequest("POST", "/api/inspiration/quotes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setIsAddQuoteOpen(false);
      setNewQuote({ text: "", author: "", source: "", category: "motivational" });
      toast({ title: "Quote added" });
    },
    onError: () => toast({ title: "Failed to add quote", variant: "destructive" }),
  });

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InspirationQuote> }) => 
      apiRequest("PATCH", `/api/inspiration/quotes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes"] });
      setEditingQuote(null);
      toast({ title: "Quote updated" });
    },
  });

  const toggleQuoteFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/quotes/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes"] }),
  });

  const toggleQuoteFeaturedMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/quotes/${id}/toggle-featured`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/dashboard"] });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inspiration/quotes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setDeleteConfirm(null);
      toast({ title: "Quote deleted" });
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: (data: typeof newVideo) => apiRequest("POST", "/api/inspiration/videos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setIsAddVideoOpen(false);
      setNewVideo({ title: "", url: "", platform: "youtube", category: "motivation", notes: "" });
      toast({ title: "Video added" });
    },
    onError: () => toast({ title: "Failed to add video", variant: "destructive" }),
  });

  const toggleVideoFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/videos/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/inspiration/videos"] }),
  });

  const toggleVideoFeaturedMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/videos/${id}/toggle-featured`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/dashboard"] });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inspiration/videos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/videos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setDeleteConfirm(null);
      toast({ title: "Video deleted" });
    },
  });

  const createMusicMutation = useMutation({
    mutationFn: (data: typeof newMusic) => apiRequest("POST", "/api/inspiration/music", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/music"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setIsAddMusicOpen(false);
      setNewMusic({ title: "", url: "", platform: "spotify", mood: "focus", artist: "", notes: "" });
      toast({ title: "Music added" });
    },
    onError: () => toast({ title: "Failed to add music", variant: "destructive" }),
  });

  const toggleMusicFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/music/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/inspiration/music"] }),
  });

  const toggleMusicFeaturedMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/music/${id}/toggle-featured`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/music"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/dashboard"] });
    },
  });

  const deleteMusicMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inspiration/music/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/music"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setDeleteConfirm(null);
      toast({ title: "Music deleted" });
    },
  });

  const createImageMutation = useMutation({
    mutationFn: (data: typeof newImage) => apiRequest("POST", "/api/inspiration/images", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setIsAddImageOpen(false);
      setNewImage({ title: "", imageUrl: "", source: "", category: "nature", usageContext: "background" });
      toast({ title: "Image added" });
    },
    onError: () => toast({ title: "Failed to add image", variant: "destructive" }),
  });

  const toggleImageFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/images/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/inspiration/images"] }),
  });

  const toggleImageFeaturedMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/images/${id}/toggle-featured`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/dashboard"] });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inspiration/images/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/images"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setDeleteConfirm(null);
      toast({ title: "Image deleted" });
    },
  });

  const createVerseMutation = useMutation({
    mutationFn: (data: typeof newVerse) => apiRequest("POST", "/api/inspiration/verses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/verses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setIsAddVerseOpen(false);
      setNewVerse({ book: "", chapter: 1, verseStart: 1, verseEnd: 0, text: "", translation: "NIV", category: "faith", notes: "" });
      toast({ title: "Verse added" });
    },
    onError: () => toast({ title: "Failed to add verse", variant: "destructive" }),
  });

  const updateVerseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InspirationVerse> }) => 
      apiRequest("PATCH", `/api/inspiration/verses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/verses"] });
      setEditingVerse(null);
      toast({ title: "Verse updated" });
    },
  });

  const toggleVerseFavoriteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/inspiration/verses/${id}/favorite`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/inspiration/verses"] }),
  });

  const deleteVerseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/inspiration/verses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/verses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspiration/stats"] });
      setDeleteConfirm(null);
      toast({ title: "Verse deleted" });
    },
  });

  const handleDelete = () => {
    if (!deleteConfirm) return;
    switch (deleteConfirm.type) {
      case "quote": deleteQuoteMutation.mutate(deleteConfirm.id); break;
      case "video": deleteVideoMutation.mutate(deleteConfirm.id); break;
      case "music": deleteMusicMutation.mutate(deleteConfirm.id); break;
      case "image": deleteImageMutation.mutate(deleteConfirm.id); break;
      case "verse": deleteVerseMutation.mutate(deleteConfirm.id); break;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Inspiration Hub</h1>
            <p className="text-muted-foreground">Your personal collection of motivational content</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>{stats?.quotesCount || 0} quotes</span>
            <span>|</span>
            <span>{stats?.videosCount || 0} videos</span>
            <span>|</span>
            <span>{stats?.musicCount || 0} playlists</span>
            <span>|</span>
            <span>{stats?.imagesCount || 0} images</span>
          </div>
        </div>

        {dailyQuote?.quote && (
          <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 overflow-hidden">
            <CardContent className="p-8 relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white/80 hover:text-white hover:bg-white/20"
                  onClick={() => refreshDailyQuote.mutate()}
                  data-testid="button-refresh-daily"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshDailyQuote.isPending ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <Quote className="h-12 w-12 text-white/30 mb-4" />
              <blockquote className="text-2xl font-serif italic mb-4" data-testid="text-daily-quote">
                "{dailyQuote.quote.text}"
              </blockquote>
              <cite className="block text-sm opacity-90" data-testid="text-daily-author">
                — {dailyQuote.quote.author || "Unknown"}
              </cite>
              {dailyQuote.quote.category && (
                <Badge variant="secondary" className="mt-4 bg-white/20 text-white border-0">
                  {dailyQuote.quote.category}
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-6">
            <TabsTrigger value="dashboard" className="gap-2 flex-shrink-0" data-testid="tab-dashboard">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="quotes" className="gap-2 flex-shrink-0" data-testid="tab-quotes">
              <Quote className="h-4 w-4" />
              <span className="hidden sm:inline">Quotes</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2 flex-shrink-0" data-testid="tab-videos">
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="music" className="gap-2 flex-shrink-0" data-testid="tab-music">
              <Music className="h-4 w-4" />
              <span className="hidden sm:inline">Music</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="gap-2 flex-shrink-0" data-testid="tab-images">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="verses" className="gap-2 flex-shrink-0" data-testid="tab-verses">
              <Book className="h-4 w-4" />
              <span className="hidden sm:inline">Verses</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {dashboardLoading ? (
              <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 h-40" />
                  </Card>
                ))}
              </div>
            ) : (
              <>
                {(dashboard?.featuredQuotes?.length || 0) > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Quote className="h-5 w-5 text-violet-500" />
                        Featured Quotes
                      </h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("quotes")} data-testid="button-view-all-quotes">
                        View All
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {dashboard?.featuredQuotes?.slice(0, 3).map((quote) => (
                        <Card key={quote.id} className="border-l-4 border-l-violet-500" data-testid={`dashboard-quote-${quote.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="outline" className="text-xs">{quote.category}</Badge>
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            </div>
                            <blockquote className="text-sm italic mb-2 line-clamp-3">"{quote.text}"</blockquote>
                            <p className="text-xs text-muted-foreground">— {quote.author || "Unknown"}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {(dashboard?.featuredVideos?.length || 0) > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Video className="h-5 w-5 text-rose-500" />
                        Featured Videos
                      </h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("videos")} data-testid="button-view-all-videos">
                        View All
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {dashboard?.featuredVideos?.slice(0, 2).map((video) => (
                        <Card key={video.id} className="border-l-4 border-l-rose-500" data-testid={`dashboard-video-${video.id}`}>
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="w-24 h-16 bg-gradient-to-br from-rose-400 to-pink-500 rounded-md flex items-center justify-center flex-shrink-0">
                                <Play className="h-6 w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="font-medium text-sm line-clamp-2">{video.title}</h3>
                                  <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{video.platform}</p>
                                <Button variant="ghost" size="sm" className="p-0 h-auto mt-1" asChild>
                                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Watch
                                  </a>
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {(dashboard?.featuredMusic?.length || 0) > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Music className="h-5 w-5 text-emerald-500" />
                        Featured Music
                      </h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("music")} data-testid="button-view-all-music">
                        View All
                      </Button>
                    </div>
                    <Card className="border-l-4 border-l-emerald-500">
                      <CardContent className="p-0 divide-y">
                        {dashboard?.featuredMusic?.slice(0, 4).map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-4" data-testid={`dashboard-music-${item.id}`}>
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-md flex items-center justify-center flex-shrink-0">
                              <Music className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-sm truncate">{item.title}</h3>
                              <p className="text-xs text-muted-foreground">{item.artist || item.platform} • {item.mood || 'focus'}</p>
                            </div>
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                <Play className="h-3 w-3 mr-1" />
                                Play
                              </a>
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {(dashboard?.featuredImages?.length || 0) > 0 && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Image className="h-5 w-5 text-blue-500" />
                        Featured Images
                      </h2>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab("images")} data-testid="button-view-all-images">
                        View All
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {dashboard?.featuredImages?.slice(0, 4).map((image) => (
                        <Card key={image.id} className="overflow-hidden border-l-4 border-l-blue-500" data-testid={`dashboard-image-${image.id}`}>
                          <div className="relative aspect-video bg-muted">
                            <img
                              src={image.imageUrl}
                              alt={image.title || "Inspiration"}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 right-2">
                              <Star className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow" />
                            </div>
                          </div>
                          <CardContent className="p-3">
                            <p className="text-sm font-medium truncate">{image.title || "Untitled"}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {!(dashboard?.featuredQuotes?.length || dashboard?.featuredVideos?.length || dashboard?.featuredMusic?.length || dashboard?.featuredImages?.length) && (
                  <Card className="p-12 text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Featured Content Yet</h3>
                    <p className="text-muted-foreground mb-4">Mark your favorite quotes, videos, music, and images as featured to see them here.</p>
                    <p className="text-sm text-muted-foreground">Use the star icon in each tab to feature your best inspiration!</p>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Quotes</h2>
              <Button onClick={() => setIsAddQuoteOpen(true)} data-testid="button-add-quote">
                <Plus className="h-4 w-4 mr-2" />
                Add Quote
              </Button>
            </div>
            {quotesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 h-40" />
                  </Card>
                ))}
              </div>
            ) : quotes.length === 0 ? (
              <Card className="p-12 text-center">
                <Quote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No quotes yet. Add your first inspirational quote!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quotes.map((quote) => (
                  <Card key={quote.id} className="group border-l-4 border-l-violet-500" data-testid={`card-quote-${quote.id}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{quote.category}</Badge>
                          {quote.isFeatured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleQuoteFeaturedMutation.mutate(quote.id)}>
                              <Star className={`h-4 w-4 mr-2 ${quote.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                              {quote.isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingQuote(quote)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ type: "quote", id: quote.id })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <blockquote className="text-sm italic mb-2 line-clamp-4">"{quote.text}"</blockquote>
                      <p className="text-xs text-muted-foreground">— {quote.author || "Unknown"}</p>
                    </CardContent>
                    <CardFooter className="px-4 py-2 border-t flex justify-between">
                      <span className="text-xs text-muted-foreground">{quote.timesViewed || 0} views</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleQuoteFavoriteMutation.mutate(quote.id)}
                        data-testid={`button-favorite-quote-${quote.id}`}
                      >
                        <Heart className={`h-4 w-4 ${quote.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Videos</h2>
              <Button onClick={() => setIsAddVideoOpen(true)} data-testid="button-add-video">
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>
            {videosLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 h-48" />
                  </Card>
                ))}
              </div>
            ) : videos.length === 0 ? (
              <Card className="p-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No videos yet. Add your first motivational video!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {videos.map((video) => (
                  <Card key={video.id} className="group border-l-4 border-l-rose-500" data-testid={`card-video-${video.id}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{video.category}</Badge>
                          {video.isFeatured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleVideoFeaturedMutation.mutate(video.id)}>
                              <Star className={`h-4 w-4 mr-2 ${video.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                              {video.isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ type: "video", id: video.id })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <h3 className="font-medium mb-1 line-clamp-2">{video.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{video.platform}</p>
                      {video.notes && <p className="text-xs text-muted-foreground line-clamp-2">{video.notes}</p>}
                    </CardContent>
                    <CardFooter className="px-4 py-2 border-t flex justify-between">
                      <Button variant="outline" size="sm" asChild>
                        <a href={video.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Watch
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleVideoFavoriteMutation.mutate(video.id)}
                        data-testid={`button-favorite-video-${video.id}`}
                      >
                        <Heart className={`h-4 w-4 ${video.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="music" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Music</h2>
              <Button onClick={() => setIsAddMusicOpen(true)} data-testid="button-add-music">
                <Plus className="h-4 w-4 mr-2" />
                Add Playlist
              </Button>
            </div>
            {musicLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 h-40" />
                  </Card>
                ))}
              </div>
            ) : music.length === 0 ? (
              <Card className="p-12 text-center">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No playlists yet. Add your first focus music!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {music.map((item) => (
                  <Card key={item.id} className="group border-l-4 border-l-emerald-500" data-testid={`card-music-${item.id}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{item.mood || 'focus'}</Badge>
                          {item.isFeatured && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleMusicFeaturedMutation.mutate(item.id)}>
                              <Star className={`h-4 w-4 mr-2 ${item.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                              {item.isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ type: "music", id: item.id })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <h3 className="font-medium mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mb-1">{item.artist || item.platform}</p>
                      {item.notes && <p className="text-xs text-muted-foreground line-clamp-2">{item.notes}</p>}
                    </CardContent>
                    <CardFooter className="px-4 py-2 border-t flex justify-between">
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <Play className="h-3 w-3 mr-1" />
                          Play
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleMusicFavoriteMutation.mutate(item.id)}
                        data-testid={`button-favorite-music-${item.id}`}
                      >
                        <Heart className={`h-4 w-4 ${item.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="images" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Images</h2>
              <Button onClick={() => setIsAddImageOpen(true)} data-testid="button-add-image">
                <Plus className="h-4 w-4 mr-2" />
                Add Image
              </Button>
            </div>
            {imagesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-0 h-48" />
                  </Card>
                ))}
              </div>
            ) : images.length === 0 ? (
              <Card className="p-12 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No images yet. Add your first inspirational image!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {images.map((image) => (
                  <Card key={image.id} className="group overflow-hidden border-l-4 border-l-blue-500" data-testid={`card-image-${image.id}`}>
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={image.imageUrl}
                        alt={image.title || "Inspiration"}
                        className="w-full h-full object-cover"
                      />
                      {image.isFeatured && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400 drop-shadow" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={() => toggleImageFeaturedMutation.mutate(image.id)}
                          data-testid={`button-featured-image-${image.id}`}
                        >
                          <Star className={`h-5 w-5 ${image.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={() => toggleImageFavoriteMutation.mutate(image.id)}
                        >
                          <Heart className={`h-5 w-5 ${image.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-white hover:bg-white/20"
                          onClick={() => setDeleteConfirm({ type: "image", id: image.id })}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{image.title || "Untitled"}</p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="outline" className="text-xs">{image.category}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="verses" className="space-y-4 mt-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Bible Verses</h2>
              <Button onClick={() => setIsAddVerseOpen(true)} data-testid="button-add-verse">
                <Plus className="h-4 w-4 mr-2" />
                Add Verse
              </Button>
            </div>
            {versesLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6 h-40" />
                  </Card>
                ))}
              </div>
            ) : verses.length === 0 ? (
              <Card className="p-12 text-center">
                <Book className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No verses yet. Add your first inspirational Bible verse!</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {verses.map((verse) => (
                  <Card key={verse.id} className="group border-l-4 border-l-amber-500" data-testid={`card-verse-${verse.id}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{verse.category}</Badge>
                          <Badge variant="secondary" className="text-xs">{verse.translation}</Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingVerse(verse)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ type: "verse", id: verse.id })} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mb-2">
                        {verse.book} {verse.chapter}:{verse.verseStart}{verse.verseEnd && verse.verseEnd > verse.verseStart ? `-${verse.verseEnd}` : ''}
                      </p>
                      <blockquote className="text-sm italic mb-2 line-clamp-4">"{verse.text}"</blockquote>
                      {verse.notes && <p className="text-xs text-muted-foreground line-clamp-2">{verse.notes}</p>}
                    </CardContent>
                    <CardFooter className="px-4 py-2 border-t flex justify-between">
                      <span className="text-xs text-muted-foreground">{verse.timesViewed || 0} views</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleVerseFavoriteMutation.mutate(verse.id)}
                        data-testid={`button-favorite-verse-${verse.id}`}
                      >
                        <Heart className={`h-4 w-4 ${verse.isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAddQuoteOpen} onOpenChange={setIsAddQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Quote</DialogTitle>
            <DialogDescription>Add an inspirational quote to your collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter the quote text..."
              value={newQuote.text}
              onChange={(e) => setNewQuote({ ...newQuote, text: e.target.value })}
              data-testid="input-quote-text"
            />
            <Input
              placeholder="Author (optional)"
              value={newQuote.author}
              onChange={(e) => setNewQuote({ ...newQuote, author: e.target.value })}
              data-testid="input-quote-author"
            />
            <Input
              placeholder="Source (optional)"
              value={newQuote.source}
              onChange={(e) => setNewQuote({ ...newQuote, source: e.target.value })}
              data-testid="input-quote-source"
            />
            <Select value={newQuote.category} onValueChange={(v) => setNewQuote({ ...newQuote, category: v })}>
              <SelectTrigger data-testid="select-quote-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddQuoteOpen(false)}>Cancel</Button>
            <Button onClick={() => createQuoteMutation.mutate(newQuote)} disabled={!newQuote.text || createQuoteMutation.isPending} data-testid="button-save-quote">
              {createQuoteMutation.isPending ? "Adding..." : "Add Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingQuote} onOpenChange={() => setEditingQuote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Quote</DialogTitle>
          </DialogHeader>
          {editingQuote && (
            <div className="space-y-4">
              <Textarea
                placeholder="Enter the quote text..."
                value={editingQuote.text}
                onChange={(e) => setEditingQuote({ ...editingQuote, text: e.target.value })}
              />
              <Input
                placeholder="Author (optional)"
                value={editingQuote.author || ""}
                onChange={(e) => setEditingQuote({ ...editingQuote, author: e.target.value })}
              />
              <Select value={editingQuote.category || "other"} onValueChange={(v) => setEditingQuote({ ...editingQuote, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {QUOTE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuote(null)}>Cancel</Button>
            <Button onClick={() => editingQuote && updateQuoteMutation.mutate({ id: editingQuote.id, data: editingQuote })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddVideoOpen} onOpenChange={setIsAddVideoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Video</DialogTitle>
            <DialogDescription>Add a motivational video to your collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Video title"
              value={newVideo.title}
              onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
              data-testid="input-video-title"
            />
            <Input
              placeholder="Video URL (YouTube, Vimeo, etc.)"
              value={newVideo.url}
              onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
              data-testid="input-video-url"
            />
            <Select value={newVideo.platform} onValueChange={(v) => setNewVideo({ ...newVideo, platform: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="vimeo">Vimeo</SelectItem>
                <SelectItem value="custom">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newVideo.category} onValueChange={(v) => setNewVideo({ ...newVideo, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {VIDEO_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes (optional)"
              value={newVideo.notes}
              onChange={(e) => setNewVideo({ ...newVideo, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVideoOpen(false)}>Cancel</Button>
            <Button onClick={() => createVideoMutation.mutate(newVideo)} disabled={!newVideo.title || !newVideo.url || createVideoMutation.isPending} data-testid="button-save-video">
              {createVideoMutation.isPending ? "Adding..." : "Add Video"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMusicOpen} onOpenChange={setIsAddMusicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Music Playlist</DialogTitle>
            <DialogDescription>Add a focus music playlist to your collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Playlist title"
              value={newMusic.title}
              onChange={(e) => setNewMusic({ ...newMusic, title: e.target.value })}
              data-testid="input-music-title"
            />
            <Input
              placeholder="Playlist URL (Spotify, YouTube Music, etc.)"
              value={newMusic.url}
              onChange={(e) => setNewMusic({ ...newMusic, url: e.target.value })}
              data-testid="input-music-url"
            />
            <Select value={newMusic.platform} onValueChange={(v) => setNewMusic({ ...newMusic, platform: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spotify">Spotify</SelectItem>
                <SelectItem value="youtube">YouTube Music</SelectItem>
                <SelectItem value="soundcloud">SoundCloud</SelectItem>
                <SelectItem value="custom">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Artist (optional)"
              value={newMusic.artist}
              onChange={(e) => setNewMusic({ ...newMusic, artist: e.target.value })}
              data-testid="input-music-artist"
            />
            <Select value={newMusic.mood} onValueChange={(v) => setNewMusic({ ...newMusic, mood: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Mood" />
              </SelectTrigger>
              <SelectContent>
                {MUSIC_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes (optional)"
              value={newMusic.notes}
              onChange={(e) => setNewMusic({ ...newMusic, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMusicOpen(false)}>Cancel</Button>
            <Button onClick={() => createMusicMutation.mutate(newMusic)} disabled={!newMusic.title || !newMusic.url || createMusicMutation.isPending} data-testid="button-save-music">
              {createMusicMutation.isPending ? "Adding..." : "Add Playlist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddImageOpen} onOpenChange={setIsAddImageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Image</DialogTitle>
            <DialogDescription>Add an inspirational image to your collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Image title (optional)"
              value={newImage.title}
              onChange={(e) => setNewImage({ ...newImage, title: e.target.value })}
              data-testid="input-image-title"
            />
            <Input
              placeholder="Image URL"
              value={newImage.imageUrl}
              onChange={(e) => setNewImage({ ...newImage, imageUrl: e.target.value })}
              data-testid="input-image-url"
            />
            <Input
              placeholder="Source (optional)"
              value={newImage.source}
              onChange={(e) => setNewImage({ ...newImage, source: e.target.value })}
            />
            <Select value={newImage.category} onValueChange={(v) => setNewImage({ ...newImage, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newImage.usageContext} onValueChange={(v) => setNewImage({ ...newImage, usageContext: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Usage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="background">Background</SelectItem>
                <SelectItem value="widget">Widget</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddImageOpen(false)}>Cancel</Button>
            <Button onClick={() => createImageMutation.mutate(newImage)} disabled={!newImage.imageUrl || createImageMutation.isPending} data-testid="button-save-image">
              {createImageMutation.isPending ? "Adding..." : "Add Image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddVerseOpen} onOpenChange={setIsAddVerseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bible Verse</DialogTitle>
            <DialogDescription>Add an inspirational Bible verse to your collection</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Book (e.g., John, Psalms, Romans)"
              value={newVerse.book}
              onChange={(e) => setNewVerse({ ...newVerse, book: e.target.value })}
              data-testid="input-verse-book"
            />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Chapter</label>
                <Input
                  type="number"
                  min={1}
                  value={newVerse.chapter}
                  onChange={(e) => setNewVerse({ ...newVerse, chapter: parseInt(e.target.value) || 1 })}
                  data-testid="input-verse-chapter"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Verse Start</label>
                <Input
                  type="number"
                  min={1}
                  value={newVerse.verseStart}
                  onChange={(e) => setNewVerse({ ...newVerse, verseStart: parseInt(e.target.value) || 1 })}
                  data-testid="input-verse-start"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Verse End</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Optional"
                  value={newVerse.verseEnd || ""}
                  onChange={(e) => setNewVerse({ ...newVerse, verseEnd: parseInt(e.target.value) || 0 })}
                  data-testid="input-verse-end"
                />
              </div>
            </div>
            <Textarea
              placeholder="Enter the verse text..."
              value={newVerse.text}
              onChange={(e) => setNewVerse({ ...newVerse, text: e.target.value })}
              data-testid="input-verse-text"
            />
            <Select value={newVerse.translation} onValueChange={(v) => setNewVerse({ ...newVerse, translation: v })}>
              <SelectTrigger data-testid="select-verse-translation">
                <SelectValue placeholder="Translation" />
              </SelectTrigger>
              <SelectContent>
                {BIBLE_TRANSLATIONS.map((trans) => (
                  <SelectItem key={trans} value={trans}>{trans}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newVerse.category} onValueChange={(v) => setNewVerse({ ...newVerse, category: v })}>
              <SelectTrigger data-testid="select-verse-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {VERSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Notes (optional)"
              value={newVerse.notes}
              onChange={(e) => setNewVerse({ ...newVerse, notes: e.target.value })}
              data-testid="input-verse-notes"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddVerseOpen(false)}>Cancel</Button>
            <Button onClick={() => createVerseMutation.mutate(newVerse)} disabled={!newVerse.book || !newVerse.text || createVerseMutation.isPending} data-testid="button-save-verse">
              {createVerseMutation.isPending ? "Adding..." : "Add Verse"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingVerse} onOpenChange={() => setEditingVerse(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bible Verse</DialogTitle>
          </DialogHeader>
          {editingVerse && (
            <div className="space-y-4">
              <Input
                placeholder="Book (e.g., John, Psalms, Romans)"
                value={editingVerse.book}
                onChange={(e) => setEditingVerse({ ...editingVerse, book: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Chapter</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingVerse.chapter}
                    onChange={(e) => setEditingVerse({ ...editingVerse, chapter: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Verse Start</label>
                  <Input
                    type="number"
                    min={1}
                    value={editingVerse.verseStart}
                    onChange={(e) => setEditingVerse({ ...editingVerse, verseStart: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Verse End</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Optional"
                    value={editingVerse.verseEnd || ""}
                    onChange={(e) => setEditingVerse({ ...editingVerse, verseEnd: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Textarea
                placeholder="Enter the verse text..."
                value={editingVerse.text}
                onChange={(e) => setEditingVerse({ ...editingVerse, text: e.target.value })}
              />
              <Select value={editingVerse.translation || "NIV"} onValueChange={(v) => setEditingVerse({ ...editingVerse, translation: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Translation" />
                </SelectTrigger>
                <SelectContent>
                  {BIBLE_TRANSLATIONS.map((trans) => (
                    <SelectItem key={trans} value={trans}>{trans}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={editingVerse.category || "faith"} onValueChange={(v) => setEditingVerse({ ...editingVerse, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {VERSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Notes (optional)"
                value={editingVerse.notes || ""}
                onChange={(e) => setEditingVerse({ ...editingVerse, notes: e.target.value })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingVerse(null)}>Cancel</Button>
            <Button onClick={() => editingVerse && updateVerseMutation.mutate({ id: editingVerse.id, data: editingVerse })}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {deleteConfirm?.type} from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
