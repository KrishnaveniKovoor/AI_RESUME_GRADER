const LoadingSpinner = ({ message = 'Processing analysis...' }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div className="spinner-border text-primary mb-3" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="text-secondary">{message}</div>
    </div>
  );
};

export default LoadingSpinner;
