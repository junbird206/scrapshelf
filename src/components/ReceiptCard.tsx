'use client';

import { Item } from '@/lib/types';

interface Props {
  item: Item;
  className?: string;
}

export default function ReceiptCard({ item, className = '' }: Props) {
  const lines = (item.content ?? '').split('\n');

  return (
    <div
      className={`receipt inline-block shadow-md ${className}`}
      style={{
        width: 140,
        transform: `rotate(${item.rotation}deg)`,
        fontFamily: 'var(--font-geist-mono)',
      }}
    >
      <div className="px-4 py-3">
        {/* 가게 헤더 */}
        <p className="text-center text-xs font-bold tracking-widest text-ink mb-2 border-b border-dashed border-ink-faint pb-2">
          SCRAPSHELF
        </p>

        {/* 내용 라인 */}
        <div className="space-y-1 mb-2">
          {lines.map((line, i) => (
            <p key={i} className="text-xs text-ink-muted leading-snug">
              {line || <span className="text-ink-faint">—</span>}
            </p>
          ))}
        </div>

        {/* 날짜/구분선 */}
        <div className="border-t border-dashed border-ink-faint pt-2 mt-2">
          <p className="text-center text-xs text-ink-faint">
            {new Date(item.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
      </div>
    </div>
  );
}
