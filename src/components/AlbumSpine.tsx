'use client';

import { motion } from 'framer-motion';
import { Album } from '@/lib/types';

interface Props {
  album: Album;
  onClick: () => void;
}

export default function AlbumSpine({ album, onClick }: Props) {
  return (
    <motion.button
      layoutId={`album-${album.id}`}
      onClick={onClick}
      whileHover={{ y: -12, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      className="relative flex flex-col items-center justify-between cursor-pointer select-none"
      style={{
        width: 48,
        height: 220,
        backgroundColor: album.cover_color,
        borderRadius: '3px 6px 6px 3px',
        boxShadow:
          'inset -3px 0 6px rgba(0,0,0,0.25), inset 3px 0 4px rgba(255,255,255,0.15), 3px 3px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* 책등 왼쪽 그림자 선 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 rounded-l"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.05))',
        }}
      />

      {/* 제목 */}
      <div className="flex-1 flex items-center justify-center w-full px-1 overflow-hidden">
        <span
          className="spine-text text-xs font-semibold leading-tight tracking-wide text-center"
          style={{
            color: getContrastColor(album.cover_color),
            fontSize: '11px',
            textShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
        >
          {album.title}
        </span>
      </div>

      {/* 하단 연도 배지 */}
      <div
        className="w-full py-1 px-1 text-center"
        style={{
          fontSize: '9px',
          color: getContrastColor(album.cover_color),
          opacity: 0.7,
          letterSpacing: '0.05em',
        }}
      >
        {new Date(album.created_at).getFullYear()}
      </div>
    </motion.button>
  );
}

/** 배경색에 따라 흰색/검정 텍스트 선택 */
function getContrastColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#2c2016' : '#f5f0e8';
}
