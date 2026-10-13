import React, { ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
  id: string | number;
  children: ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition,
    isDragging 
  } = useSortable({ id });

  // CSS.Transform এর বদলে CSS.Translate ব্যবহার করা হয়েছে যা 2D মুভমেন্টের জন্য ১00% ফেইল-প্রুফ
  const style = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="relative touch-none"
    >
      {/* শুধু আইকন দিয়ে ড্র্যাগ করতে চাইলে listeners এবং attributes এখানে কাস্টমাইজ করা যায়। 
          পুরো কার্ড ড্র্যাগ করার সুবিধার জন্য আমরা প্যারেন্ট div-এই রাখলাম */}
      <div {...attributes} {...listeners}>
        {children}
      </div>
    </div>
  );
}