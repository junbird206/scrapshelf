'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const MAX_DISPLAY_W = 280;
const MAX_DISPLAY_H = 420;
/** 크롭 프레임을 이미지 대비 이 비율로 설정 — 나머지가 패닝 여유 */
const FRAME_SCALE = 0.82;

interface DisplayInfo {
  dw: number; dh: number; // 이미지 표시 크기
  fw: number; fh: number; // 크롭 프레임 크기 (4:5)
}

function getDisplayInfo(natW: number, natH: number): DisplayInfo {
  const aspect = natW / natH;
  let dw = MAX_DISPLAY_W;
  let dh = dw / aspect;
  if (dh > MAX_DISPLAY_H) { dh = MAX_DISPLAY_H; dw = dh * aspect; }
  dw = Math.round(dw); dh = Math.round(dh);

  // 이미지에 들어갈 수 있는 최대 4:5 프레임
  let fw: number, fh: number;
  if (dw * 5 / 4 <= dh) { fw = dw; fh = dw * 5 / 4; }
  else                   { fh = dh; fw = dh * 4 / 5; }

  fw = Math.round(fw * FRAME_SCALE);
  fh = Math.round(fh * FRAME_SCALE);
  return { dw, dh, fw, fh };
}

/** 폴라로이드 색감: 대비 +10% · 채도 +8% · 따뜻함 · 블랙 리프트 */
function applyPolaroidFilter(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    r = (r - 128) * 1.10 + 128; g = (g - 128) * 1.10 + 128; b = (b - 128) * 1.10 + 128;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * 1.08; g = gray + (g - gray) * 1.08; b = gray + (b - gray) * 1.08;
    r += 10; b -= 6;
    r = r * 0.93 + 14; g = g * 0.93 + 10; b = b * 0.93 + 8;
    d[i] = Math.min(255, Math.max(0, r));
    d[i + 1] = Math.min(255, Math.max(0, g));
    d[i + 2] = Math.min(255, Math.max(0, b));
  }
  ctx.putImageData(img, 0, 0);
}

interface Props {
  src: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
}

export default function CropConfirmModal({ src, onConfirm, onCancel }: Props) {
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [framePos, setFramePos] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);
  const drag = useRef<{ sx: number; sy: number; fx: number; fy: number } | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  // nat 확정 후 프레임을 중앙에 초기 배치
  useEffect(() => {
    if (!nat.w) return;
    const { dw, dh, fw, fh } = getDisplayInfo(nat.w, nat.h);
    setFramePos({ x: Math.round((dw - fw) / 2), y: Math.round((dh - fh) / 2) });
  }, [nat]);

  const info: DisplayInfo | null = nat.w > 0 ? getDisplayInfo(nat.w, nat.h) : null;

  function clampFrame(x: number, y: number) {
    if (!info) return { x, y };
    return {
      x: Math.min(info.dw - info.fw, Math.max(0, x)),
      y: Math.min(info.dh - info.fh, Math.max(0, y)),
    };
  }

  /** 이미지 영역 어디서든 드래그 → 프레임이 따라 이동 */
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, fx: framePos.x, fy: framePos.y };
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setFramePos(clampFrame(
      drag.current.fx + (e.clientX - drag.current.sx),
      drag.current.fy + (e.clientY - drag.current.sy),
    ));
  }
  function onPointerUp() { drag.current = null; }

  function handleConfirm() {
    if (!nat.w || !info || processing) return;
    setProcessing(true);
    const canvas = document.createElement('canvas');
    canvas.width = 720; canvas.height = 900;
    const ctx = canvas.getContext('2d')!;
    const img = new window.Image();
    img.onload = () => {
      // 표시 좌표 → 원본 픽셀 좌표로 변환
      const sx = nat.w / info.dw;
      const sy = nat.h / info.dh;
      ctx.drawImage(img,
        framePos.x * sx, framePos.y * sy,
        info.fw * sx, info.fh * sy,
        0, 0, 720, 900,
      );
      applyPolaroidFilter(ctx, 720, 900);
      URL.revokeObjectURL(src);
      onConfirm(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = src;
  }

  const OVERLAY = 'rgba(0,0,0,0.52)';
  const BLUR = 'blur(3px)';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[60] flex items-center justify-center px-5"
      style={{ backgroundColor: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-paper flex flex-col items-center"
        style={{
          borderRadius: 4,
          padding: '20px 20px 22px',
          boxShadow: '0 28px 64px rgba(0,0,0,0.55)',
          width: (info?.dw ?? MAX_DISPLAY_W) + 40,
          transition: 'width 0.15s ease',
        }}
      >
        <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-4">
          구도 조정
        </p>

        {/* ── 이미지 표시 영역 ── */}
        {info ? (
          <div
            style={{
              width: info.dw, height: info.dh,
              position: 'relative', overflow: 'hidden',
              borderRadius: 2, cursor: 'move',
              touchAction: 'none', userSelect: 'none',
              backgroundColor: '#111',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* 원본 이미지 (비율 유지) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              draggable={false}
              style={{ position: 'absolute', width: info.dw, height: info.dh, top: 0, left: 0, pointerEvents: 'none' }}
            />

            {/* ── 바깥 흐림 오버레이 (4방향) ── */}
            {/* 위 */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: framePos.y, background: OVERLAY, backdropFilter: BLUR, pointerEvents: 'none' }} />
            {/* 아래 */}
            <div style={{ position: 'absolute', top: framePos.y + info.fh, left: 0, right: 0, bottom: 0, background: OVERLAY, backdropFilter: BLUR, pointerEvents: 'none' }} />
            {/* 왼쪽 */}
            <div style={{ position: 'absolute', top: framePos.y, left: 0, width: framePos.x, height: info.fh, background: OVERLAY, backdropFilter: BLUR, pointerEvents: 'none' }} />
            {/* 오른쪽 */}
            <div style={{ position: 'absolute', top: framePos.y, left: framePos.x + info.fw, right: 0, height: info.fh, background: OVERLAY, backdropFilter: BLUR, pointerEvents: 'none' }} />

            {/* ── 크롭 프레임 (4:5) ── */}
            <div
              style={{
                position: 'absolute',
                top: framePos.y, left: framePos.x,
                width: info.fw, height: info.fh,
                border: '1.5px solid rgba(255,255,255,0.85)',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }}
            >
              {/* 삼등분 가이드선 */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: [
                  'linear-gradient(to right,  transparent calc(33.33% - 0.5px), rgba(255,255,255,0.18) calc(33.33% - 0.5px), rgba(255,255,255,0.18) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px))',
                  'linear-gradient(to right,  transparent calc(66.66% - 0.5px), rgba(255,255,255,0.18) calc(66.66% - 0.5px), rgba(255,255,255,0.18) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))',
                  'linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.18) calc(33.33% - 0.5px), rgba(255,255,255,0.18) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px))',
                  'linear-gradient(to bottom, transparent calc(66.66% - 0.5px), rgba(255,255,255,0.18) calc(66.66% - 0.5px), rgba(255,255,255,0.18) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))',
                ].join(', '),
              }} />
              {/* 모서리 마크 */}
              <div style={{ position: 'absolute', top: 0,    left: 0,  width: 14, height: 14, borderTop:    '2px solid rgba(255,255,255,0.95)', borderLeft:   '2px solid rgba(255,255,255,0.95)' }} />
              <div style={{ position: 'absolute', top: 0,    right: 0, width: 14, height: 14, borderTop:    '2px solid rgba(255,255,255,0.95)', borderRight:  '2px solid rgba(255,255,255,0.95)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0,  width: 14, height: 14, borderBottom: '2px solid rgba(255,255,255,0.95)', borderLeft:   '2px solid rgba(255,255,255,0.95)' }} />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderBottom: '2px solid rgba(255,255,255,0.95)', borderRight:  '2px solid rgba(255,255,255,0.95)' }} />
            </div>
          </div>
        ) : (
          <div style={{ width: MAX_DISPLAY_W, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p className="text-xs text-ink-faint animate-pulse">이미지 로딩 중…</p>
          </div>
        )}

        <p className="text-xs mt-3" style={{ color: '#a09080', minHeight: 16 }}>
          {info ? '드래그해서 구도 조정' : ''}
        </p>

        <div className="flex gap-3 w-full mt-3">
          <button
            onClick={onCancel}
            disabled={processing}
            className="flex-1 py-2 text-sm text-ink-muted border border-ink-faint hover:bg-paper-dark transition-colors disabled:opacity-40"
            style={{ borderRadius: 2 }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={!nat.w || processing}
            className="flex-1 py-2 text-2xl hover:opacity-80 transition-opacity disabled:opacity-30"
            style={{ borderRadius: 2, background: '#2c2016' }}
            title="확정"
          >
            {processing ? '⏳' : '📷'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
