import React from 'react';

function AnimatedNumber({ value, ...props }) {
  // Try to convert to number
  const numValue = Number(value);
  const isValidNumber = typeof numValue === 'number' && !isNaN(numValue) && value !== '' && value !== null;

  return (
    <span {...props}>
      {isValidNumber ? numValue.toFixed(2) : (value || 'N/A')}
    </span>
  );
}

export default AnimatedNumber; 