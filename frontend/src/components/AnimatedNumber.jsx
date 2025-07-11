import React, { useEffect, useRef, useState } from 'react';

const AnimatedNumber = ({ value, duration = 900, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const raf = useRef();
  const startValue = useRef(0);
  const startTime = useRef(null);

  useEffect(() => {
    cancelAnimationFrame(raf.current);
    startValue.current = displayValue;
    startTime.current = null;
    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const newValue = startValue.current + (value - startValue.current) * progress;
      setDisplayValue(newValue);
      if (progress < 1) {
        raf.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line
  }, [value]);

  return (
    <span className={`animated-number ${className}`}>
      {Number.isInteger(value) ? Math.round(displayValue) : displayValue.toFixed(2)}
    </span>
  );
};

export default AnimatedNumber; 