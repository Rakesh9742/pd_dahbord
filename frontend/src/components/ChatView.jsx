import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter, LineChart, Line, ZAxis } from 'recharts';
import './ChatView.css';

const STATUS_COLORS = {
  pass: '#00ff88',
  fail: '#ff4757',
  continue_with_error: '#ffa502',
  unknown: '#8884d8',
};

function getRuntimeMinutes(str) {
  if (!str || typeof str !== 'string' || !str.includes(':')) return 0;
  const [h, m] = str.split(':').map(Number);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

const ChatView = ({ data, stats }) => {
  const [chartType, setChartType] = useState('stage');

  // --- Data Preparation ---
  // 1. Stage-wise stacked bar
  const stageStatusCounts = (() => {
    const result = {};
    data.forEach(row => {
      const stage = (row.stage || 'Unknown').trim();
      const status = (row.run_status || 'unknown').replace(/\s/g, '').toLowerCase();
      if (!result[stage]) result[stage] = { stage, pass: 0, fail: 0, continue_with_error: 0, unknown: 0 };
      if (result[stage][status] !== undefined) result[stage][status] += 1;
      else result[stage].unknown += 1;
    });
    return Object.values(result);
  })();

  // 2. Area vs Runtime scatter (colored by status)
  const scatterData = data.map(row => {
    let runtime = 0;
    if (row['runtime(hr:min)']) {
      const [h, m] = row['runtime(hr:min)'].split(':').map(Number);
      runtime = h * 60 + m;
    }
    return {
      area: parseFloat(row['Area(um2)']) || 0,
      runtime,
      status: (row['run status  (pass/fail/continue_with_error)'] || row.run_status || 'unknown').replace(/\s/g, '').toLowerCase(),
      stage: (row.stage || 'Unknown').trim(),
    };
  }).filter(d => d.area > 0 && d.runtime > 0);

  // 3. Status pie
  const statusCounts = data.reduce((acc, row) => {
    const status = (row['run status  (pass/fail/continue_with_error)'] || row.run_status || 'unknown').replace(/\s/g, '').toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const statusPieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || '#8884d8' }));

  // 4. Time trend (runs per day)
  const timeTrend = (() => {
    const byDate = {};
    data.forEach(row => {
      let date = row['run end time'] || row['run_end_time'] || '';
      if (date.includes('/')) {
        // Format: DD/MM/YYYY
        const [d, m, y] = date.split('/');
        date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      } else if (date.includes('-')) {
        // Format: YYYY-MM-DD
        date = date.split('T')[0];
      }
      if (!byDate[date]) byDate[date] = { date, runs: 0, avg_runtime: 0, total_runtime: 0 };
      byDate[date].runs += 1;
      // runtime
      let runtime = 0;
      if (row['runtime(hr:min)']) {
        const [h, m] = row['runtime(hr:min)'].split(':').map(Number);
        runtime = h * 60 + m;
      }
      byDate[date].total_runtime += runtime;
    });
    Object.values(byDate).forEach(d => {
      d.avg_runtime = d.runs ? d.total_runtime / d.runs : 0;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  })();

  // --- Heatmap Data Preparation ---
  // Build a matrix: rows=stage, cols=block_name, value=avg runtime (min)
  const heatmapMatrix = (() => {
    const stageSet = new Set();
    const blockSet = new Set();
    const cellMap = {};
    data.forEach(row => {
      const stage = (row.stage || 'Unknown').trim();
      const block = (row.block_name || row.block || 'Unknown').trim();
      stageSet.add(stage);
      blockSet.add(block);
      const key = `${stage}|||${block}`;
      if (!cellMap[key]) cellMap[key] = { sum: 0, count: 0 };
      cellMap[key].sum += getRuntimeMinutes(row['runtime(hr:min)']);
      cellMap[key].count += 1;
    });
    const stages = Array.from(stageSet);
    const blocks = Array.from(blockSet);
    // Build matrix
    const matrix = stages.map(stage =>
      blocks.map(block => {
        const key = `${stage}|||${block}`;
        const cell = cellMap[key];
        return cell && cell.count > 0 ? cell.sum / cell.count : null;
      })
    );
    // Find min/max for color scale
    let min = Infinity, max = -Infinity;
    matrix.forEach(row => row.forEach(val => {
      if (val !== null) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }));
    return { stages, blocks, matrix, min, max };
  })();

  function getHeatColor(val, min, max) {
    if (val === null) return '#eee';
    // Linear scale: light blue (#e0f7fa) to dark blue (#01579b)
    const t = (val - min) / (max - min + 0.0001);
    const r = Math.round(224 + (1 - t) * (1 - 224));
    const g = Math.round(247 + (1 - t) * (1 - 247));
    const b = Math.round(250 + (1 - t) * (155 - 250));
    // Use a blue scale
    return `rgb(${Math.round(224 - t * 209)},${Math.round(247 - t * 232)},${Math.round(250 - t * 155)})`;
  }

  // --- Chart Renderers ---
  const renderStageBar = () => (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={stageStatusCounts} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="stage" stroke="#fff" />
        <YAxis allowDecimals={false} stroke="#fff" />
        <Tooltip />
        <Legend />
        <Bar dataKey="pass" stackId="a" fill={STATUS_COLORS.pass} name="Pass" />
        <Bar dataKey="fail" stackId="a" fill={STATUS_COLORS.fail} name="Fail" />
        <Bar dataKey="continue_with_error" stackId="a" fill={STATUS_COLORS.continue_with_error} name="Continue with Error" />
        <Bar dataKey="unknown" stackId="a" fill={STATUS_COLORS.unknown} name="Unknown" />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderScatter = () => (
    <ResponsiveContainer width="100%" height={340}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="area" name="Area (um²)" stroke="#fff" />
        <YAxis dataKey="runtime" name="Runtime (min)" stroke="#fff" />
        <ZAxis range={[100, 400]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Legend />
        {Object.keys(STATUS_COLORS).map(status => (
          <Scatter
            key={status}
            name={status.charAt(0).toUpperCase() + status.slice(1)}
            data={scatterData.filter(d => d.status === status)}
            fill={STATUS_COLORS[status]}
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );

  const renderPie = () => (
    <ResponsiveContainer width="100%" height={340}>
      <PieChart>
        <Pie
          data={statusPieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={110}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {statusPieData.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderTimeTrend = () => (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={timeTrend} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#fff" />
        <YAxis yAxisId="left" allowDecimals={false} stroke="#fff" />
        <YAxis yAxisId="right" orientation="right" stroke="#fff" />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="runs" stroke="#00d2ff" name="Runs" strokeWidth={3} />
        <Line yAxisId="right" type="monotone" dataKey="avg_runtime" stroke="#ff6b6b" name="Avg Runtime (min)" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderHeatmap = () => (
    <div className="heatmap-container">
      <div className="heatmap-title">Stage vs Block Heatmap (Avg Runtime in min)</div>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `120px repeat(${heatmapMatrix.blocks.length}, 1fr)` }}>
        <div className="heatmap-corner"></div>
        {heatmapMatrix.blocks.map(block => (
          <div key={block} className="heatmap-header">{block}</div>
        ))}
        {heatmapMatrix.stages.map((stage, i) => [
          <div key={stage} className="heatmap-header">{stage}</div>,
          ...heatmapMatrix.matrix[i].map((val, j) => (
            <div key={j} className="heatmap-cell" style={{ background: getHeatColor(val, heatmapMatrix.min, heatmapMatrix.max) }}>
              {val !== null ? val.toFixed(1) : ''}
            </div>
          ))
        ])}
      </div>
      <div className="heatmap-legend">
        <span>{heatmapMatrix.min.toFixed(1)} min</span>
        <div className="heatmap-legend-bar"></div>
        <span>{heatmapMatrix.max.toFixed(1)} min</span>
      </div>
    </div>
  );

  // --- Main Render ---
  return (
    <div className="chat-view">
      <div className="chat-header">
        <h3>📊 Data Analytics Chat</h3>
        <div className="chat-controls">
          <button className={chartType === 'stage' ? 'active' : ''} onClick={() => setChartType('stage')}>Stage-wise Status</button>
          <button className={chartType === 'scatter' ? 'active' : ''} onClick={() => setChartType('scatter')}>Area vs Runtime</button>
          <button className={chartType === 'pie' ? 'active' : ''} onClick={() => setChartType('pie')}>Status Pie</button>
          <button className={chartType === 'trend' ? 'active' : ''} onClick={() => setChartType('trend')}>Time Trend</button>
          <button className={chartType === 'heatmap' ? 'active' : ''} onClick={() => setChartType('heatmap')}>Heatmap</button>
        </div>
      </div>
      <div className="chat-content">
        <div className="chart-section">
          {chartType === 'stage' && renderStageBar()}
          {chartType === 'scatter' && renderScatter()}
          {chartType === 'pie' && renderPie()}
          {chartType === 'trend' && renderTimeTrend()}
          {chartType === 'heatmap' && renderHeatmap()}
        </div>
      </div>
    </div>
  );
};

export default ChatView; 