import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const DESKTOP_BREAKPOINT = 768;

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export default function BottomSheet({ isOpen, onClose, maxHeight = '60vh', title, children }) {
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const touchStartY = useRef(0);
  const contentRef = useRef(null);
  const isDesktop = useIsDesktop();

  // Slide in after mount
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setDragY(0);
    setDragging(false);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  // Mobile swipe-to-dismiss
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    setDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!dragging) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    if (dragY > 100) {
      handleClose();
    } else {
      setDragY(0);
    }
    setDragging(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 5000,
          opacity: visible ? 1 : 0,
          transition: 'opacity 200ms ease-out',
        }}
      />

      {isDesktop ? (
        /* Desktop: centered modal */
        <div
          ref={contentRef}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            zIndex: 5001,
            background: '#1A1A1A',
            borderRadius: 16,
            width: '90%',
            maxWidth: 520,
            maxHeight: '70vh',
            transform: visible
              ? 'translate(-50%, -50%) scale(1)'
              : 'translate(-50%, -50%) scale(0.95)',
            opacity: visible ? 1 : 0,
            transition: 'transform 200ms ease-out, opacity 200ms ease-out',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
            border: '1px solid rgba(197,164,78,0.15)',
          }}
        >
          {/* Header with close button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 12px' }}>
            {title && (
              <h3
                className="font-serif font-bold"
                style={{ fontSize: '1.1rem', color: '#C5A44E', margin: 0 }}
              >
                {title}
              </h3>
            )}
            <button
              onClick={handleClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#888',
                cursor: 'pointer',
                padding: 4,
                fontSize: '1.25rem',
                lineHeight: 1,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Scrollable content */}
          <div style={{ padding: '0 24px 20px', overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
        </div>
      ) : (
        /* Mobile: bottom sheet */
        <div
          ref={contentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 5001,
            background: '#1A1A1A',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight,
            transform: visible
              ? `translateY(${dragY}px)`
              : 'translateY(100%)',
            transition: dragging ? 'none' : 'transform 200ms ease-out',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Drag handle */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: '#444' }} />
          </div>

          {/* Title */}
          {title && (
            <div style={{ padding: '0 24px 12px' }}>
              <h3
                className="font-serif font-bold"
                style={{ fontSize: '1.1rem', color: '#C5A44E', margin: 0 }}
              >
                {title}
              </h3>
            </div>
          )}

          {/* Scrollable content */}
          <div style={{ padding: '0 24px 16px', overflowY: 'auto', flex: 1 }}>
            {children}
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
