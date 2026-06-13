import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadResumeFile, submitAnalysis } from '../api/analysisService';
import LoadingSpinner from '../components/LoadingSpinner';

const recruiterOptions = [
  'ATS Screening Recruiter',
  'Technical Recruiter',
  'Startup Founder',
  'HR Recruiter',
  'Product Company Recruiter',
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [recruiterPersona, setRecruiterPersona] = useState(recruiterOptions[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setResumeFile(event.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a PDF resume and enter the job description.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const uploadResponse = await uploadResumeFile(formData);
      const analysisPayload = {
        resumeFileName: uploadResponse.data.fileName,
        jobDescription,
        recruiterPersona,
      };
      const analyzeResponse = await submitAnalysis(analysisPayload);
      localStorage.setItem('resume_grader_latest_result', JSON.stringify(analyzeResponse.data.analysis));
      localStorage.setItem('resume_grader_latest_payload', JSON.stringify(analysisPayload));
      navigate('/results');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to perform analysis.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-xl-10">
        <div className="card card-shadow p-4 mb-4">
          <h2 className="mb-3">Resume Grader Dashboard</h2>
          <p className="text-muted">Upload your resume, select a recruiter persona, and receive recruiter-style ATS feedback.</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">Upload Resume (PDF)</label>
              <input type="file" accept="application/pdf" className="form-control" onChange={handleFileChange} />
            </div>
            <div className="mb-4">
              <label className="form-label">Job Description</label>
              <textarea
                className="form-control"
                rows="8"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
              />
            </div>
            <div className="mb-4">
              <label className="form-label">Recruiter Persona</label>
              <select
                className="form-select"
                value={recruiterPersona}
                onChange={(e) => setRecruiterPersona(e.target.value)}
              >
                {recruiterOptions.map((persona) => (
                  <option value={persona} key={persona}>
                    {persona}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary btn-lg" disabled={loading}>
              {loading ? 'Analyzing resume…' : 'Analyze Resume'}
            </button>
          </form>
        </div>
        <div className="card card-shadow p-4">
          <h5 className="mb-3">How it works</h5>
          <ul>
            <li>Upload a PDF resume.</li>
            <li>Provide the job description you want to optimize for.</li>
            <li>Select a recruiter persona for tailored feedback.</li>
            <li>Review the ATS score, missing keywords, strengths, and hiring recommendation.</li>
          </ul>
        </div>
      </div>
      {loading && <LoadingSpinner />}
    </div>
  );
};

export default Dashboard;
