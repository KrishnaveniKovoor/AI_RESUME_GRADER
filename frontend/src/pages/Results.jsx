import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { rewriteResume, generateInterviewQuestions } from '../api/analysisService';
import CircularScore from '../components/CircularScore';
import AnalysisCard from '../components/AnalysisCard';
import MatchGrid from '../components/MatchGrid';
import InterviewAccordion from '../components/InterviewAccordion';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CachedIcon from '@mui/icons-material/Cached';
import { jsPDF } from 'jspdf';

const Results = () => {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [optimizedResume, setOptimizedResume] = useState('');
  const [interviewQuestions, setInterviewQuestions] = useState({ technicalQuestions: [], projectQuestions: [], hrQuestions: [] });
  const [loadingRewrite, setLoadingRewrite] = useState(false);
  const [loadingInterview, setLoadingInterview] = useState(false);
  const [error, setError] = useState('');
  const [interviewError, setInterviewError] = useState('');

  const getSavedAnalysisPayload = () => {
    try {
      return JSON.parse(localStorage.getItem('resume_grader_latest_payload') || '{}');
    } catch (err) {
      return {};
    }
  };

  const getAnalysisContext = () =>
    [
      Array.isArray(analysis?.strengths) ? `Strengths: ${analysis.strengths.join(', ')}` : '',
      Array.isArray(analysis?.weaknesses) ? `Weaknesses: ${analysis.weaknesses.join(', ')}` : '',
      Array.isArray(analysis?.missingSkills) ? `Missing skills: ${analysis.missingSkills.join(', ')}` : '',
      Array.isArray(analysis?.missingKeywords) ? `Missing keywords: ${analysis.missingKeywords.join(', ')}` : '',
      analysis?.hiringRecommendation ? `Hiring recommendation: ${analysis.hiringRecommendation}` : '',
    ]
      .filter(Boolean)
      .join('\n');

  const getAnalysisPayload = () => {
    const savedPayload = getSavedAnalysisPayload();

    return {
      analysisId: analysis?._id,
      resumeFileName: analysis?.resumeFileName || savedPayload.resumeFileName,
      jobDescription: analysis?.jobDescription || savedPayload.jobDescription,
      recruiterPersona: analysis?.recruiterPersona || savedPayload.recruiterPersona,
      resumeContext: getAnalysisContext(),
    };
  };

  const hasRequiredResumePayload = (payload) =>
    Boolean(payload.resumeFileName && payload.jobDescription && payload.recruiterPersona);

  const hasRequiredInterviewPayload = (payload) =>
    Boolean((payload.resumeFileName || payload.resumeContext) && payload.jobDescription && payload.recruiterPersona);

  useEffect(() => {
    const saved = localStorage.getItem('resume_grader_latest_result');
    if (saved) {
      setAnalysis(JSON.parse(saved));
    } else {
      navigate('/dashboard');
    }
  }, [navigate]);

  if (!analysis) {
    return null;
  }

  const handleCopyResume = async () => {
    try {
      await navigator.clipboard.writeText(optimizedResume);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([optimizedResume], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'optimized-resume.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF('p', 'pt', 'a4');
    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const lines = doc.splitTextToSize(optimizedResume, pageWidth);
    doc.setFontSize(11);
    doc.text(lines, margin, 60);
    doc.save('optimized-resume.pdf');
  };

  const handleGenerateResume = async () => {
    setError('');
    setLoadingRewrite(true);

    try {
      const payload = getAnalysisPayload();
      if (!hasRequiredResumePayload(payload)) {
        throw new Error('This analysis is missing the resume, job description, or persona needed to generate a resume.');
      }

      const response = await rewriteResume(payload);
      setOptimizedResume(response.data.optimizedResume || '');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate optimized resume.');
    } finally {
      setLoadingRewrite(false);
    }
  };

  const handleGenerateInterview = async () => {
    setInterviewError('');
    setLoadingInterview(true);

    try {
      const payload = getAnalysisPayload();
      if (!hasRequiredInterviewPayload(payload)) {
        throw new Error('This analysis is missing the resume, job description, or persona needed to generate interview questions.');
      }

      const response = await generateInterviewQuestions(payload);
      setInterviewQuestions({
        technicalQuestions: response.data?.technicalQuestions || [],
        projectQuestions: response.data?.projectQuestions || [],
        hrQuestions: response.data?.hrQuestions || [],
      });
    } catch (err) {
      console.error('Interview generation error', err);
      const message = err.response?.data?.message || err.message || 'Failed to generate interview questions.';
      setInterviewError(message);
    } finally {
      setLoadingInterview(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', pb: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 1120 }}>
        {/* Page heading */}
        <Box sx={{ pt: 2, mb: 3, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ fontWeight: 800 }}>
            Analysis Results
          </Typography>
        </Box>

        {/* ATS Score + Resume vs Job Description — fully centred */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, mb: 5 }}>
          <CircularScore score={analysis.atsScore} label="ATS Score" />
          <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center' }}>
            Resume vs Job Description
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 560 }}>
            <MatchGrid metrics={analysis} />
          </Box>
        </Box>

        {/* Content sections */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Strengths
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <AnalysisCard content={analysis.strengths} />
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Weaknesses
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <AnalysisCard content={analysis.weaknesses} />
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Missing Keywords
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <AnalysisCard content={Array.isArray(analysis.missingKeywords) ? analysis.missingKeywords.join(', ') : analysis.missingKeywords} />
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Missing Skills
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <AnalysisCard content={Array.isArray(analysis.missingSkills) ? analysis.missingSkills.join(', ') : analysis.missingSkills} />
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Suggestions
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <AnalysisCard content={analysis.suggestions} />
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
            Hiring Recommendation
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <AnalysisCard content={analysis.hiringRecommendation} />
          </Card>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            AI Resume Rewriter
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generate an optimized resume based on your current resume, job description, and recruiter persona.
            </Typography>
            {error && (
              <Box sx={{ mb: 2 }}>
                <Typography color="error">{error}</Typography>
              </Box>
            )}
            <Button
              variant="contained"
              startIcon={<CachedIcon />}
              onClick={handleGenerateResume}
              disabled={loadingRewrite}
              sx={{ mb: 3 }}
            >
              {loadingRewrite ? 'Generating optimized resume…' : 'Generate ATS Optimized Resume'}
            </Button>

            {optimizedResume ? (
              <Box sx={{ mt: 2 }}>
                <Card sx={{ bgcolor: 'background.default', mb: 3, p: 2, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
                      Optimized Resume
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-line', color: 'text.primary' }}>
                      {optimizedResume}
                    </Typography>
                  </CardContent>
                </Card>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Button variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCopyResume}>
                    Copy
                  </Button>
                  <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleDownloadTxt}>
                    Download TXT
                  </Button>
                  <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleDownloadPdf}>
                    Download PDF
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Card>
        </Box>

        {/* AI Mock Interview */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
            AI Mock Interview
          </Typography>
          <Card sx={{ p: 3, bgcolor: 'background.paper' }} elevation={3}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Generate personalized interview questions based on your resume, job description and recruiter persona.
            </Typography>
            <Button
              variant="contained"
              onClick={handleGenerateInterview}
              disabled={loadingInterview}
              sx={{ mb: 3 }}
            >
              {loadingInterview ? 'Generating interview questions…' : 'Generate Interview Questions'}
            </Button>

            {interviewError ? (
              <Box sx={{ mb: 2 }}>
                <Typography color="error">{interviewError}</Typography>
              </Box>
            ) : null}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <InterviewAccordion title="Technical Questions" questions={interviewQuestions.technicalQuestions} />
              <InterviewAccordion title="Project-Based Questions" questions={interviewQuestions.projectQuestions} />
              <InterviewAccordion title="HR Questions" questions={interviewQuestions.hrQuestions} />
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Results;
