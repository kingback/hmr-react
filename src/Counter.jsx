import React, { useState, useEffect } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCount(count + 1);
    }, 1000);
    return () => setTimeout(timer);
  });

  return (
    <div>Counter: {count}</div>
  )
}