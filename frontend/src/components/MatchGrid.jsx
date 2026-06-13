import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

const toPercent = (val) => {
  if (val === null || val === undefined) return 0;
  let n = val;
  if (typeof n === 'string') {
    n = parseFloat(n.replace('%', '')) || 0;
  }
  if (typeof n === 'number') {
    // If 0-1 range, convert to percentage
    if (n > 0 && n <= 1) n = n * 100;
  } else {
    n = 0;
  }
  if (!isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const MatchBar = ({ label, value }) => {
  const percent = toPercent(value);

  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 2,
        backgroundColor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {label}
        </Typography>
        <Typography variant="h6" className="notranslate" translate="no" sx={{ color: 'text.primary', fontWeight: 700 }}>
          {Math.round(percent)}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 12,
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.18)',
          '& .MuiLinearProgress-bar': { backgroundColor: 'primary.main' },
        }}
      />
    </Box>
  );
};

const MatchGrid = ({ metrics = {} }) => {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <MatchBar label="Technical Skills Match" value={metrics.technicalSkillsMatch ?? 0} />
      <MatchBar label="Projects Match" value={metrics.projectsMatch ?? 0} />
      <MatchBar label="Experience Match" value={metrics.experienceMatch ?? 0} />
      <MatchBar label="Education Match" value={metrics.educationMatch ?? 0} />
    </Box>
  );
};

export default MatchGrid;
