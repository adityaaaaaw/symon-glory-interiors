import React from 'react';

const LoadingSpinner = ({ size = 'md', fullPage = false }) => {
  const spinnerElement = (
    <div className={`spinner-container ${size}`}>
      <div className="spinner"></div>
      <p className="loading-text">Loading Glory Simon Interiors...</p>
    </div>
  );

  if (fullPage) {
    return (
      <div className="loading-overlay">
        {spinnerElement}
      </div>
    );
  }

  return spinnerElement;
};

export default LoadingSpinner;
