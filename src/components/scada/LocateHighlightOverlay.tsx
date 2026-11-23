import React, { useEffect, useState } from 'react';
import { useB5Store } from '../../store/b5Store.ts';

interface HighlightBox {
  left: number;
  top: number;
  width: number;
  height: number;
  key: string;
  tag: string;
}

/**
 * Renders a steady light-yellow bounding box around the located device/sensor for 2.0 seconds
 * after double-clicking an item on a Floor Overview screen.
 */
export const LocateHighlightOverlay: React.FC = () => {
  const locatedTarget = useB5Store((s) => s.locatedTarget);
  const activeScreen = useB5Store((s) => s.activeScreen);
  const [box, setBox] = useState<HighlightBox | null>(null);

  const expectedKey =
    locatedTarget && locatedTarget.screen === activeScreen
      ? `${locatedTarget.tag}-${locatedTarget.ts ?? 0}`
      : null;

  useEffect(() => {
    if (!locatedTarget || locatedTarget.screen !== activeScreen) {
      return;
    }

    const pad = 7;
    const targetTag = locatedTarget.tag;
    const uniqueKey = `${targetTag}-${locatedTarget.ts ?? 0}`;

    const measure = (scroll: boolean) => {
      const el = document.querySelector(`[data-scada-tag="${CSS.escape(targetTag)}"]`);
      if (!el) return false;
      if (scroll) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      setBox({
        left: r.left - pad,
        top: r.top - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
        key: uniqueKey,
        tag: targetTag,
      });
      return true;
    };

    // Wait 1 frame so the newly active screen SVG/DOM has mounted and laid out
    const rafId = window.requestAnimationFrame(() => {
      measure(true);
    });
    // Re-measure shortly after smooth scroll settles
    const settleId = window.setTimeout(() => measure(false), 180);

    const onViewportChange = () => measure(false);
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);

    // Automatically hide bounding box right after the 2.0s (4 x 0.5s) blink completes
    const clearId = window.setTimeout(() => {
      setBox(null);
    }, 2050);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(settleId);
      window.clearTimeout(clearId);
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
    };
  }, [locatedTarget, activeScreen]);

  if (!expectedKey || !box || box.key !== expectedKey) return null;

  return (
    <div
      key={box.key}
      style={{
        position: 'fixed',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        border: '3px solid #fde047',
        backgroundColor: 'rgba(254, 240, 138, 0.28)',
        boxShadow: '0 0 14px rgba(250, 204, 21, 0.6), inset 0 0 8px rgba(254, 240, 138, 0.35)',
        borderRadius: '6px',
        pointerEvents: 'none',
        zIndex: 60,
      }}
      className="animate-locate-hold"
    >
      <span className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-yellow-300 text-slate-950 font-mono text-[9.5px] font-black border border-yellow-600 shadow whitespace-nowrap">
        {box.tag}
      </span>
    </div>
  );
};
