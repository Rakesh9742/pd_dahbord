import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import DuplicateErrorLogsPage from './DuplicateErrorLogsPage';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);
root.render(
  <React.StrictMode>
    <DuplicateErrorLogsPage />
  </React.StrictMode>
);
