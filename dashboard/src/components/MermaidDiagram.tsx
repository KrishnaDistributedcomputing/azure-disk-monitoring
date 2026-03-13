'use client';

import { useEffect, useRef, useState } from 'react';

interface MermaidDiagramProps {
  chart: string;
  id?: string;
  className?: string;
}

export default function MermaidDiagram({ chart, id = 'mermaid-diagram', className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Load mermaid from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).__mermaidLoaded) { setLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.onload = () => { (window as any).__mermaidLoaded = true; setLoaded(true); };
    document.head.appendChild(script);
  }, []);

  // Render diagram once mermaid is loaded
  useEffect(() => {
    if (!loaded || !containerRef.current) return;
    const mermaid = (window as any).mermaid;
    if (!mermaid) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        darkMode: true,
        background: '#0f172a',
        primaryColor: '#1e40af',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#334155',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        mainBkg: '#1e293b',
        clusterBkg: '#111827',
        clusterBorder: '#374151',
        nodeTextColor: '#e2e8f0',
      },
      flowchart: { curve: 'basis', padding: 15, htmlLabels: true, useMaxWidth: true },
      securityLevel: 'loose',
    });

    const renderDiv = containerRef.current;
    const uniqueId = `${id}-${Date.now()}`;
    renderDiv.innerHTML = '';
    mermaid.render(uniqueId, chart).then(({ svg }: { svg: string }) => {
      renderDiv.innerHTML = svg;
      // Style SVG for dark theme
      const svgEl = renderDiv.querySelector('svg');
      if (svgEl) {
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';
      }
    }).catch(() => {
      renderDiv.innerHTML = `<pre style="color:#94a3b8;font-size:11px;white-space:pre-wrap;overflow-x:auto">${chart}</pre>`;
    });
  }, [loaded, chart, id]);

  return (
    <div className={`rounded-xl border border-slate-700 bg-slate-900 p-4 overflow-x-auto ${className}`}>
      {!loaded && <div className="text-sm text-slate-500 py-8 text-center">Loading diagram...</div>}
      <div ref={containerRef} />
    </div>
  );
}
