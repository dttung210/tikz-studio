
import React, { useEffect, useRef } from 'react';

interface MathJaxDisplayProps {
  content: string;
}

declare global {
  interface Window {
    MathJax: any;
  }
}

export const MathJaxDisplay: React.FC<MathJaxDisplayProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.MathJax && containerRef.current) {
      containerRef.current.innerHTML = '';
      const el = document.createElement('div');
      el.innerText = content.includes('$$') || content.includes('$') ? content : `$$ ${content} $$`;
      containerRef.current.appendChild(el);

      if (typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise([el])
          .catch((err: any) => console.error('MathJax typeset failed: ', err));
      } else if (typeof window.MathJax.typeset === 'function') {
        window.MathJax.typeset([el]);
      }
    }
  }, [content]);

  return (
    <div className="w-full overflow-x-auto p-4 bg-white border border-slate-100 rounded-xl min-h-[100px] flex items-center justify-center transition-all">
      <div ref={containerRef} className="text-slate-800 selection:bg-indigo-100" />
    </div>
  );
};
