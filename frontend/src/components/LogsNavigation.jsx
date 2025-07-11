import React, { useState } from 'react';
import RealTimeLogs from './RealTimeLogs';
import LogSummary from './LogSummary';
import './LogsNavigation.css';

const LogsNavigation = () => {
  const [activeTab, setActiveTab] = useState('summary');

  const tabs = [
    { id: 'summary', label: '📊 Log Summary', component: LogSummary },
    { id: 'realtime', label: '⚡ Real-Time', component: RealTimeLogs }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="logs-navigation">
      <div className="logs-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="tab-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default LogsNavigation; 