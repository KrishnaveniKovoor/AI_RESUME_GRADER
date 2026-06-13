import { useEffect, useState } from 'react';
import { fetchHistory, fetchAllHistory, removeAnalysis } from '../api/analysisService';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const History = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [history, setHistory] = useState([]);
  const [allHistory, setAllHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminError, setAdminError] = useState('');
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'all'

  const loadHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchHistory();
      setHistory(response.data.history);
    } catch (err) {
      setError('Failed to load your history.');
    } finally {
      setLoading(false);
    }
  };

  const loadAllHistory = async () => {
    setAdminLoading(true);
    setAdminError('');
    try {
      const response = await fetchAllHistory();
      setAllHistory(response.data.history);
    } catch (err) {
      setAdminError('Failed to load all users history.');
    } finally {
      setAdminLoading(false);
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

  useEffect(() => {
    if (isAdmin && activeTab === 'all') {
      loadAllHistory();
    }
  }, [activeTab, isAdmin]);

  const HistoryCard = ({ item, showUser = false, onDelete }) => (
    <div className="card card-shadow mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3">
          <div style={{ flex: 1 }}>
            {showUser && item.userId && (
              <div className="mb-2 d-flex align-items-center gap-2">
                <span
                  style={{
                    background: 'rgba(0,119,182,0.12)',
                    border: '1px solid rgba(0,119,182,0.3)',
                    borderRadius: '20px',
                    padding: '2px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: '#0077b6',
                  }}
                >
                  👤 {item.userId.name} &nbsp;·&nbsp; {item.userId.email}
                </span>
              </div>
            )}
            <h5 className="card-title mb-1">{item.recruiterPersona}</h5>
            <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
              Submitted: {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="mb-1">
              <strong>ATS Score:</strong>{' '}
              <span
                style={{
                  fontWeight: 700,
                  color: item.atsScore >= 75 ? '#2ecc71' : item.atsScore >= 50 ? '#f39c12' : '#e74c3c',
                }}
              >
                {item.atsScore}
              </span>
            </p>
            <p className="mb-0">
              <strong>Missing Keywords:</strong>{' '}
              {item.missingKeywords?.length
                ? item.missingKeywords.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        display: 'inline-block',
                        background: 'rgba(231,76,60,0.1)',
                        border: '1px solid rgba(231,76,60,0.3)',
                        borderRadius: '10px',
                        padding: '1px 8px',
                        fontSize: '0.78rem',
                        marginRight: '4px',
                        marginTop: '2px',
                        color: '#c0392b',
                      }}
                    >
                      {kw}
                    </span>
                  ))
                : <span className="text-muted">None</span>}
            </p>
          </div>
          {onDelete && (
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={() => onDelete(item._id)}
              style={{ flexShrink: 0 }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="row justify-content-center">
      <div className="col-xl-10">
        {/* Header */}
        <div className="card card-shadow p-4 mb-4">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h2 className="mb-1">Analysis History</h2>
              <p className="text-muted mb-0">
                {isAdmin
                  ? 'As admin you can view your own history or all users\' history.'
                  : 'Your personal resume analysis records.'}
              </p>
            </div>
            {isAdmin && (
              <span
                style={{
                  background: 'rgba(255,193,7,0.18)',
                  border: '1px solid rgba(255,193,7,0.5)',
                  borderRadius: '20px',
                  padding: '4px 14px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#b8860b',
                }}
              >
                👑 Admin View
              </span>
            )}
          </div>

          {/* Tabs — only visible to admin */}
          {isAdmin && (
            <div className="mt-3 d-flex gap-2">
              <button
                className={`btn btn-sm ${activeTab === 'mine' ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => setActiveTab('mine')}
              >
                My History
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'all' ? 'btn-warning text-dark' : 'btn-outline-warning'}`}
                onClick={() => setActiveTab('all')}
              >
                👑 All Users&apos; History
              </button>
            </div>
          )}
        </div>

        {/* ── My History Tab ── */}
        {activeTab === 'mine' && (
          <>
            {loading && <LoadingSpinner />}
            {error && <div className="alert alert-danger">{error}</div>}
            {!loading && history.length === 0 && (
              <div className="alert alert-info">You have no analysis history yet.</div>
            )}
            {history.map((item) => (
              <HistoryCard key={item._id} item={item} onDelete={handleDelete} />
            ))}
          </>
        )}

        {/* ── All Users' History Tab (admin only) ── */}
        {activeTab === 'all' && isAdmin && (
          <>
            {adminLoading && <LoadingSpinner />}
            {adminError && <div className="alert alert-danger">{adminError}</div>}
            {!adminLoading && allHistory.length === 0 && (
              <div className="alert alert-info">No analysis records found across all users.</div>
            )}
            {allHistory.map((item) => (
              <HistoryCard key={item._id} item={item} showUser={true} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default History;
