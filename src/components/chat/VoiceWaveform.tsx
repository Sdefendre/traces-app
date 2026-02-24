interface VoiceWaveformProps {
  audioLevel: number;
}

const BAR_COUNT = 5;
const BASE_HEIGHT = 4;
const MAX_HEIGHT = 24;

const MULTIPLIERS = [0.6, 0.9, 1.0, 0.85, 0.55];

export function VoiceWaveform({ audioLevel }: VoiceWaveformProps) {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const scale = MULTIPLIERS[i];
        const height =
          BASE_HEIGHT + (MAX_HEIGHT - BASE_HEIGHT) * audioLevel * scale;
        return (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              height: `${height}px`,
              background: 'linear-gradient(180deg, #2383e2, #9b59b6)',
              transition: 'height 80ms ease-out',
            }}
          />
        );
      })}
    </div>
  );
}
