import { useState, useEffect } from "react";
import type { Profile } from "@/lib/types";
import { explainExoplanetData } from "@/lib/gemini";
import { textToSpeech } from "@/lib/elevenlabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Volume2, Loader2, Pause } from "lucide-react";

export default function MatchItem({ p, tone = 0 }: { p: Profile; tone?: number }) {
  const src = p.photos[0];
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load explanation when component mounts
    const loadExplanation = async () => {
      setLoading(true);
      try {
        const result = await explainExoplanetData(p);
        setExplanation(result);
      } catch (error) {
        console.error("Error:", error);
        setExplanation("Failed to load explanation.");
      } finally {
        setLoading(false);
      }
    };
    loadExplanation();
  }, [p]);

  const handlePlayPause = async () => {
    if (loadingAudio || !explanation) return;

    // If audio element exists, just play/pause it
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
      return;
    }

    // Generate audio for the first time
    setLoadingAudio(true);
    try {
      const audio = await textToSpeech(explanation);
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setAudioElement(audio);
      setIsPlaying(true);
    } catch (error) {
      console.error("Error generating audio:", error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const gradientFrom = (
    [
      "from-primary/20",
      "from-secondary/20",
      "from-accent/20",
      "from-chart-4/20",
    ][tone % 4]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={`rounded-xl p-3 cursor-pointer transition-colors border border-white/5 bg-gradient-to-br ${gradientFrom} via-background to-background hover:shadow-lg hover:shadow-primary/10`}>
          <div className="flex items-center gap-3 mb-3">
            <img src={src} alt={p.name} className="h-12 w-12 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.bio}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePlayPause();
              }}
              disabled={loading || loadingAudio}
              className="p-2 rounded-full hover:bg-accent transition-colors disabled:opacity-50"
            >
              {loadingAudio ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Loading description...</span>
            </div>
          ) : explanation ? (
            <p className="text-sm text-muted-foreground line-clamp-2">{explanation}</p>
          ) : null}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4">
            <img src={src} alt={p.name} className="h-20 w-20 rounded-full object-cover ring-4 ring-primary/20" />
            <div className="flex-1">
              <h2 className="text-3xl font-bold">{p.name}</h2>
              <p className="text-sm text-muted-foreground font-normal flex items-center gap-2 mt-1">
                <span>📍 {p.location || "Unknown Location"}</span>
              </p>
            </div>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-6 pt-6">
              {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating explanation...</span>
                </div>
              ) : (
                <>
                  {/* Description Section */}
                  <div className="bg-accent/30 rounded-lg p-4">
                    <p className="text-base leading-relaxed">{explanation}</p>
                  </div>

                  {/* Audio Button */}
                  <button
                    onClick={handlePlayPause}
                    disabled={loadingAudio}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loadingAudio ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Generating audio...</span>
                      </>
                    ) : isPlaying ? (
                      <>
                        <Pause className="h-5 w-5" />
                        <span>Pause Narration</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="h-5 w-5" />
                        <span>Listen to Narration</span>
                      </>
                    )}
                  </button>

                  {/* Statistics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg p-4 border border-blue-500/20">
                      <div className="text-2xl font-bold text-accent">{p.age}</div>
                      <div className="text-xs text-muted-foreground mt-1">Billion Years Old</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg p-4 border border-purple-500/20">
                      <div className="text-2xl font-bold text-secondary">{p.photos.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">Images Available</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg p-4 border border-green-500/20">
                      <div className="text-2xl font-bold text-primary">{p.tags?.length || 0}</div>
                      <div className="text-xs text-muted-foreground mt-1">Key Features</div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg p-4 border border-orange-500/20">
                      <div className="text-2xl font-bold text-chart-4">{p.bio?.length || 0}</div>
                      <div className="text-xs text-muted-foreground mt-1">Bio Characters</div>
                    </div>
                  </div>

                  {/* Detailed Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      📊 Detailed Information
                    </h3>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-accent/20 rounded-lg">
                          <span className="text-xl">🌍</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-muted-foreground">Type</div>
                            <div className="text-base">{p.bio}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 bg-accent/20 rounded-lg">
                          <span className="text-xl">📍</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-muted-foreground">Location</div>
                            <div className="text-base">{p.location || "Unknown"}</div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-accent/20 rounded-lg">
                          <span className="text-xl">🎂</span>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-muted-foreground">Age</div>
                            <div className="text-base">{p.age} billion years</div>
                          </div>
                        </div>

                        {p.tags && p.tags.length > 0 && (
                          <div className="flex items-start gap-3 p-3 bg-accent/20 rounded-lg">
                            <span className="text-xl">🏷️</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-muted-foreground">Features</div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {p.tags.map((tag, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-primary/20 text-primary rounded-md text-xs font-medium">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Image Gallery */}
                  {p.photos.length > 1 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        🖼️ Image Gallery
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {p.photos.map((photo, idx) => (
                          <img
                            key={idx}
                            src={photo}
                            alt={`${p.name} view ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-border hover:scale-105 transition-transform"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
