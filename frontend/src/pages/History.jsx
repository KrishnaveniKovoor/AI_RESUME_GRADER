import { useEffect, useState } from 'react';
import { fetchHistory, removeAnalysis } from '../api/analysisService';
import LoadingSpinner from '../components/LoadingSpinner';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchHistory();
      setHistory(response.data.history);
    } catch (err) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await removeAnalysis(id);
      setHistory((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError('Unable to delete record.');
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="row justify-content-center">
      <div className="col-xl-10">
        <div className="card card-shadow p-4 mb-4">
          <h2 className="mb-3">Analysis History</h2>
          <p className="text-muted">Review your saved resume analysis records for improvements over time.</p>
        </div>
        {loading && <LoadingSpinner />}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && history.length === 0 && <div className="alert alert-info">No analysis history yet.</div>}
        {history.map((item) => (
          <div key={item._id} className="card card-shadow mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h5 className="card-title">{item.recruiterPersona}</h5>
                  <p className="mb-1 text-muted">Submitted: {new Date(item.createdAt).toLocaleString()}</p>
                  <p className="mb-1"><strong>ATS Score:</strong> {item.atsScore}</p>
                  <p className="mb-1"><strong>Missing Keywords:</strong> {item.missingKeywords.join(', ') || 'None'}</p>
                </div>
                <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(item._id)}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;
