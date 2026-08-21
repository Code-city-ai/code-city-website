import React, { useEffect, useRef } from 'react';

const candles = [
  [42, 58, 37, 53], [53, 66, 49, 61], [61, 70, 55, 58], [58, 63, 45, 49],
  [49, 57, 40, 54], [54, 72, 51, 68], [68, 81, 62, 76], [76, 83, 66, 70],
  [70, 78, 59, 64], [64, 73, 57, 69], [69, 87, 66, 82], [82, 91, 75, 79],
  [79, 86, 68, 72], [72, 80, 63, 77], [77, 93, 74, 88], [88, 96, 82, 91],
  [91, 97, 79, 83], [83, 92, 78, 89], [89, 101, 85, 97], [97, 105, 91, 102],
];

function drawChart(canvas, progress) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);

  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);

  const dark = document.documentElement.dataset.theme === 'dark';
  const width = rect.width;
  const height = rect.height;
  const left = 12;
  const right = 14;
  const top = 12;
  const bottom = 20;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  context.clearRect(0, 0, width, height);
  context.strokeStyle = dark ? 'rgba(235,241,246,0.09)' : 'rgba(15,29,40,0.10)';
  context.lineWidth = 1;

  for (let row = 0; row <= 4; row += 1) {
    const y = top + (chartHeight / 4) * row;
    context.beginPath();
    context.moveTo(left, y);
    context.lineTo(width - right, y);
    context.stroke();
  }

  for (let column = 0; column <= 6; column += 1) {
    const x = left + (chartWidth / 6) * column;
    context.beginPath();
    context.moveTo(x, top);
    context.lineTo(x, height - bottom);
    context.stroke();
  }

  const visibleCount = Math.max(1, Math.ceil(candles.length * progress));
  const step = chartWidth / candles.length;
  const candleWidth = Math.max(3, Math.min(8, step * 0.54));
  const scaleY = (value) => top + chartHeight - ((value - 34) / 74) * chartHeight;
  const closePoints = [];

  candles.slice(0, visibleCount).forEach(([open, high, low, close], index) => {
    const x = left + step * index + step / 2;
    const rising = close >= open;
    const color = rising ? '#2fa77b' : '#f36a49';
    const openY = scaleY(open);
    const closeY = scaleY(close);

    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(x, scaleY(high));
    context.lineTo(x, scaleY(low));
    context.stroke();
    context.fillRect(x - candleWidth / 2, Math.min(openY, closeY), candleWidth, Math.max(2, Math.abs(closeY - openY)));
    closePoints.push([x, closeY]);
  });

  if (closePoints.length > 1) {
    context.strokeStyle = '#2d84be';
    context.lineWidth = 1.6;
    context.beginPath();
    closePoints.forEach(([x, y], index) => {
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.stroke();
  }
}

export default function TradeCityCharts() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let frame = 0;

    const animate = (time) => {
      const progress = reduceMotion ? 1 : Math.min(1, (time - startedAt) / 1150);
      drawChart(canvas, 1 - ((1 - progress) ** 3));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => drawChart(canvas, 1));
    const themeObserver = new MutationObserver(() => drawChart(canvas, 1));
    resizeObserver.observe(canvas);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div className="trade-market-terminal">
      <header className="trade-terminal-header">
        <div><span>BTC / USD</span><b>Live market</b></div>
        <nav aria-label="Chart time range"><span>1D</span><span className="is-active">1W</span><span>1M</span><span>1Y</span></nav>
      </header>
      <div className="trade-price-row">
        <div><strong>$67,842.31</strong><em>+2.48%</em></div>
        <span>Updated now <i aria-hidden="true" /></span>
      </div>
      <div className="trade-chart-frame">
        <canvas ref={canvasRef} role="img" aria-label="Animated one-week Bitcoin candlestick chart showing a rising market" />
        <div className="trade-chart-axis" aria-hidden="true"><span>68K</span><span>64K</span><span>60K</span></div>
      </div>
      <div className="trade-market-strip" aria-label="Market overview">
        <div><span>ETH</span><strong>$3,482.09</strong><em>+1.92%</em><i className="is-up" /></div>
        <div><span>NVDA</span><strong>$184.42</strong><em>+3.14%</em><i className="is-up is-delayed" /></div>
        <div><span>TSLA</span><strong>$421.18</strong><em>−0.62%</em><i className="is-down" /></div>
      </div>
    </div>
  );
}
