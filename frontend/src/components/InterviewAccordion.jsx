import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const InterviewAccordion = ({ title, questions = [] }) => (
  <Accordion elevation={2} sx={{ bgcolor: 'background.paper', color: 'text.primary' }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      {questions.length === 0 ? (
        <Typography color="text.secondary">No questions generated yet.</Typography>
      ) : (
        <ol>
          {questions.map((question, index) => (
            <li key={index} style={{ marginBottom: '0.75rem', lineHeight: 1.6 }}>
              {question}
            </li>
          ))}
        </ol>
      )}
    </AccordionDetails>
  </Accordion>
);

export default InterviewAccordion;
