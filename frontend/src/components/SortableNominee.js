import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableNominee({ id, index, totalNominees, disabled, description, onInfoClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const points = totalNominees - index;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center rounded-lg gold-border mb-2 transition-colors drag-item ${
        isDragging ? 'drag-item-dragging bg-oscar-gold/10' : 'bg-oscar-black hover:bg-oscar-gold/5'
      } ${disabled ? 'opacity-60' : ''}`}
      {...attributes}
    >
      {/* Left half — drag activator zone */}
      {!disabled ? (
        <div
          ref={setActivatorNodeRef}
          {...listeners}
          className="flex items-center gap-3 pl-4 py-3 pr-2 cursor-grab active:cursor-grabbing touch-none"
          style={{ minWidth: '50%' }}
        >
          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            index === 0 ? 'gold-gradient text-oscar-black' : 'bg-oscar-white/10 text-oscar-white/60'
          }`}>
            {index + 1}
          </span>
          <svg className="w-5 h-5 text-oscar-white/30 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
          </svg>
          <span className="flex-1 text-sm md:text-base text-oscar-white/90 truncate">{id}</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 pl-4 py-3 pr-2" style={{ minWidth: '50%' }}>
          <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            index === 0 ? 'gold-gradient text-oscar-black' : 'bg-oscar-white/10 text-oscar-white/60'
          }`}>
            {index + 1}
          </span>
          <span className="flex-1 text-sm md:text-base text-oscar-white/90 truncate">{id}</span>
        </div>
      )}

      {/* Right half — allows vertical scroll passthrough */}
      <div className="flex-1" style={{ touchAction: 'pan-y' }} />
      {description && !disabled && (
        <button
          onClick={(e) => { e.stopPropagation(); onInfoClick?.(); }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex-shrink-0 flex items-center justify-center"
          style={{ width: 44, height: 44, touchAction: 'pan-y' }}
          aria-label={`Info about ${id}`}
        >
          <svg
            className="w-4 h-4 transition-colors"
            style={{ color: '#A0A0A0' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#C5A44E'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#A0A0A0'}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
      )}
      <span className="text-xs text-oscar-gold/50 flex-shrink-0 pr-4 py-3 text-right" style={{ touchAction: 'pan-y', minWidth: 44 }}>{points} pt{points !== 1 ? 's' : ''}</span>
    </div>
  );
}
