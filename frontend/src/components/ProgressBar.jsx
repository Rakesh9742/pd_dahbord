import React from 'react';

const ProgressBar = ({ percent = 0, color = '#6366f1', className = '' }) => {
  return (
    <div className={`progress-bar ${className}`}>
      <div
        className="progress-bar__fill"
        style={{ width: `${percent}%`, background: color }}
      />
    </div>
  );
};

export default ProgressBar; 