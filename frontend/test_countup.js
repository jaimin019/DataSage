import React from 'react';
import { renderToString } from 'react-dom/server';
import CountUp from 'react-countup';

try {
  const html = renderToString(React.createElement(CountUp, { end: NaN, duration: 2 }));
  console.log("Success:", html);
} catch (e) {
  console.error("Crash:", e.message);
}
