import { useCallback, useRef, useEffect } from "react";

const COMPLETION_CHIME_URL = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoGAACA/4CAf39/fn19fX19fn5/f4CAgYGBgoGBgYGAgH9/fn5+fn5+fn5/gICBgYKCgoKCgYGAgH9/fn19fX5+f3+AgIGBgoKCgoGBgH9/fn19fX5+f3+AgIGBgoKCgoKBgIB/f359fX1+fn9/gICBgYKCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgoGAgH9/fn19fX5+f3+AgIGBgoKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgoGAgH9/fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoKBgH9/fn19fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKCgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn59fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/f359fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/gICAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICBgYKCgoGBgH9/fn59fX5+f3+AgIGBgoKCgYGAf39+fn19fn5/f4CAgYGCgoKBgYB/f35+fX1+fn9/gICA";

export function useCompletionSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(COMPLETION_CHIME_URL);
    audioRef.current.volume = 0.3;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playChime = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently fail if autoplay is blocked
      });
    }
  }, []);

  return { playChime };
}
