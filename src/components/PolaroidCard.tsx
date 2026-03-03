'use client';

import { Item } from '@/lib/types';

interface Props {
  item: Item;
  className?: string;
}

export default function PolaroidCard({ item, className = '' }: Props) {
  return (
    <div
      className={`polaroid inline-block ${className}`}
      style={{ transform: `rotate(${item.rotation}deg)`, width: 160 }}
    >
      {/* 이미지 영역 — 4:5 폴라로이드 비율 */}
      <div
        className="bg-paper-dark overflow-hidden"
        style={{ width: '100%', aspectRatio: '4 / 5' }}
      >
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt={item.content ?? ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-faint text-sm">
            📷
          </div>
        )}
      </div>

      {/* 하단 캡션 */}
      <div
        className="text-center text-ink-muted"
        style={{ fontFamily: 'var(--font-geist-sans)', fontSize: '11px', marginTop: 6 }}
      >
        {item.content ?? ''}
      </div>
    </div>
  );
}
