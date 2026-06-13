import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

const AnalysisCard = ({ content, sx = {} }) => {
  const renderContent = () => {
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return (
          <Typography variant="body2" color="text.secondary">
            None
          </Typography>
        );
      }
      return (
        <Box component="ul" sx={{ pl: 2, m: 0 }}>
          {content.map((item, index) => (
            <Box component="li" key={index} sx={{ mb: 0.5 }}>
              <Typography variant="body2">{item}</Typography>
            </Box>
          ))}
        </Box>
      );
    }

    // Fallback to string rendering (preserve newlines)
    return (
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
        {content}
      </Typography>
    );
  };

  return <Box sx={sx}>{renderContent()}</Box>;
};

export default AnalysisCard;
