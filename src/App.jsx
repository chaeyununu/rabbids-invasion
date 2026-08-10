import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Scene from './components/Scene';
import UI from './components/UI';
import { BACKGROUNDS } from './config/backgrounds';
import { RABBIDS } from './config/rabbids';
import { preloadModel, scheduleModelPreload } from './utils/modelCache';
import './App.css';

const BACKGROUND_MUSIC_URL =
  'https://xrlcazxrrwszjnqordaq.supabase.co/storage/v1/object/public/music/jonasblakewood-upbeat-533852.mp3';

function BackgroundMusic() {
  const audioRef = useRef(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const playOnce = () => {
      if (hasStartedRef.current) return;

      audio
        .play()
        ?.then(() => {
          hasStartedRef.current = true;
        })
        .catch(() => {});
    };

    const unlockPlayback = () => {
      if (hasStartedRef.current) return;
      audio.currentTime = 0;
      playOnce();
    };

    audio.currentTime = 0;
    playOnce();
    window.addEventListener('pointerdown', unlockPlayback, { once: true });
    window.addEventListener('keydown', unlockPlayback, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockPlayback);
      window.removeEventListener('keydown', unlockPlayback);
    };
  }, []);

  return <audio ref={audioRef} src={BACKGROUND_MUSIC_URL} autoPlay preload="auto" />;
}

export default function App() {
  const [bgIndex, setBgIndex] = useState(0);
  const [rabbidIndex, setRabbidIndex] = useState(0);

  const adjacent = useMemo(() => {
    const prevBg = (bgIndex - 1 + BACKGROUNDS.length) % BACKGROUNDS.length;
    const nextBg = (bgIndex + 1) % BACKGROUNDS.length;
    const prevRabbid = (rabbidIndex - 1 + RABBIDS.length) % RABBIDS.length;
    const nextRabbid = (rabbidIndex + 1) % RABBIDS.length;

    return {
      prevBackground: BACKGROUNDS[prevBg],
      nextBackground: BACKGROUNDS[nextBg],
      prevRabbid: RABBIDS[prevRabbid],
      nextRabbid: RABBIDS[nextRabbid],
    };
  }, [bgIndex, rabbidIndex]);

  const selectBackground = useCallback((targetIndex) => {
    if (targetIndex === bgIndex) return;

    setBgIndex(targetIndex);
    preloadModel(BACKGROUNDS[targetIndex].path);
  }, [bgIndex]);

  const nextBackground = useCallback(() => {
    selectBackground((bgIndex + 1) % BACKGROUNDS.length);
  }, [bgIndex, selectBackground]);

  const prevBackground = useCallback(() => {
    selectBackground((bgIndex - 1 + BACKGROUNDS.length) % BACKGROUNDS.length);
  }, [bgIndex, selectBackground]);

  const nextRabbid = useCallback(() => {
    setRabbidIndex((i) => (i + 1) % RABBIDS.length);
  }, []);

  const prevRabbid = useCallback(() => {
    setRabbidIndex((i) => (i - 1 + RABBIDS.length) % RABBIDS.length);
  }, []);

  const warmPrevBackground = useCallback(() => {
    scheduleModelPreload(adjacent.prevBackground.path);
  }, [adjacent.prevBackground.path]);

  const warmNextBackground = useCallback(() => {
    scheduleModelPreload(adjacent.nextBackground.path);
  }, [adjacent.nextBackground.path]);

  const warmPrevRabbid = useCallback(() => {
    scheduleModelPreload(adjacent.prevRabbid.path);
  }, [adjacent.prevRabbid.path]);

  const warmNextRabbid = useCallback(() => {
    scheduleModelPreload(adjacent.nextRabbid.path);
  }, [adjacent.nextRabbid.path]);

  return (
    <div className="app-root">
      <BackgroundMusic />
      <Scene background={BACKGROUNDS[bgIndex]} rabbid={RABBIDS[rabbidIndex]} />
      <UI
        bgLabel={BACKGROUNDS[bgIndex].label}
        rabbidIndex={rabbidIndex}
        rabbidCount={RABBIDS.length}
        onPrevBackground={prevBackground}
        onNextBackground={nextBackground}
        onPrevRabbid={prevRabbid}
        onNextRabbid={nextRabbid}
        onWarmPrevBackground={warmPrevBackground}
        onWarmNextBackground={warmNextBackground}
        onWarmPrevRabbid={warmPrevRabbid}
        onWarmNextRabbid={warmNextRabbid}
      />
    </div>
  );
}
