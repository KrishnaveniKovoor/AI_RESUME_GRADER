import { useThemeMode } from '../context/ThemeContext';

const CircularScore = ({ score, label = 'ATS Score' }) => {
  const { mode } = useThemeMode();
  const progress = Math.min(100, Math.max(0, score));
  const size = 220;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  // Light mode: rich, dark saturated colors so the arc pops on the light teal card
  // Dark mode: keep the existing bright teal palette
  const getScoreColor = () => {
    if (mode === 'light') {
      if (progress >= 90) return '#03045e';   // Deep Twilight — excellent
      if (progress >= 70) return '#023e8a';   // French Blue — good
      return '#0077b6';                        // Bright Teal Blue — needs work
    } else {
      if (progress >= 90) return '#48cae4';   // Sky Aqua
      if (progress >= 70) return '#00b4d8';   // Turquoise Surf
      return '#90e0ef';                        // Frosted Blue
    }
  };

  const trackColor = mode === 'light'
    ? 'rgba(3, 4, 94, 0.15)'    // dark navy tint track in light mode
    : 'rgba(72, 202, 228, 0.2)'; // subtle teal track in dark mode

  const textColor = mode === 'light' ? '#03045e' : '#e8f4fd';

  const scoreColor = getScoreColor();

  return (
    <div className="progress-circle gauge-circle">
      <svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="progress-value text-center">
        <div>
          <div className="fs-2 notranslate" translate="no" style={{ color: textColor, fontSize: '3.05rem', lineHeight: 1, fontWeight: 800 }}>
            {progress}%
          </div>
          <div style={{ color: textColor, marginTop: 8, fontSize: '1.05rem', opacity: 0.8 }}>{label}</div>
        </div>
      </div>
    </div>
  );
};

export default CircularScore;
