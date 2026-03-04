interface Props {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onGoToStep: (n: number) => void;
  onSetSpeed: (level: number) => void;
}

const SPEED_OPTIONS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
  { label: '3×', value: 3 },
  { label: '5×', value: 5 },
];

export function Controls({
  isPlaying,
  currentStep,
  totalSteps,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBack,
  onGoToStep,
  onSetSpeed,
}: Props) {
  const progress = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {/* Step back */}
      <button
        onClick={onStepBack}
        disabled={currentStep === 0}
        className="p-1.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors"
        title="Step back"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 3h2v10H3V3zm8.5 5L6 3v10l5.5-5z" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="p-1.5 text-gray-600 hover:text-white transition-colors"
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2l10 6-10 6V2z" />
          </svg>
        )}
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        disabled={currentStep === totalSteps - 1}
        className="p-1.5 text-gray-600 hover:text-white disabled:opacity-20 transition-colors"
        title="Step forward"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11 3h2v10h-2V3zM4.5 8L10 3v10L4.5 8z" />
        </svg>
      </button>

      {/* Scrubber */}
      <div
        className="flex-1 h-px bg-white/10 cursor-pointer relative group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          onGoToStep(Math.round(ratio * (totalSteps - 1)));
        }}
      >
        <div
          className="h-full bg-white/50 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${progress}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>

      {/* Step counter */}
      <span className="text-[10px] font-mono tabular-nums text-gray-600 min-w-[3.5rem] text-right">
        {currentStep + 1} / {totalSteps}
      </span>

      {/* Speed pills */}
      <div className="flex items-center gap-0.5">
        {SPEED_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSetSpeed(opt.value)}
            className={`text-[10px] px-1.5 py-0.5 rounded-full transition-colors ${
              speed === opt.value
                ? 'text-white bg-white/10'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
