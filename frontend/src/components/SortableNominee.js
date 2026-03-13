import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableNominee({ id, index, totalNominees, disabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
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
      className={`flex items-center gap-3 px-4 py-3 rounded-lg gold-border mb-2 transition-colors drag-item ${
        isDragging ? 'drag-item-dragging bg-oscar-gold/10' : 'bg-oscar-black hover:bg-oscar-gold/5'
      } ${disabled ? 'opacity-60' : 'cursor-grab active:cursor-grabbing'}`}
      {...attributes}
      {...listeners}
    >
      {/* Rank number */}
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        index === 0 ? 'gold-gradient text-oscar-black' : 'bg-oscar-white/10 text-oscar-white/60'
      }`}>
        {index + 1}
      </span>

      {/* Drag handle */}
      {!disabled && (
        <svg className="w-4 h-4 text-oscar-white/30 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z"/>
        </svg>
      )}

      {/* Nominee name */}
      <span className="flex-1 text-sm md:text-base text-oscar-white/90">{id}</span>

      {/* Points indicator */}
      <span className="text-xs text-oscar-gold/50 flex-shrink-0">{points} pt{points !== 1 ? 's' : ''}</span>
    </div>
  );
}
