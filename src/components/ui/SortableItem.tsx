import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
}

export const SortableItem = ({ id, children }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // 👇 এই একটি ম্যাজিক লাইনের কারণেই মোবাইলে স্ক্রল আটকে ছিল! 
    // pan-y এর মানে হলো: "উপরে-নিচে স্ক্রল অ্যালাউ করো"
    touchAction: 'pan-y', 
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-pan-y h-full">
      {children}
    </div>
  );
};