'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Album, Event } from '@/lib/types';
import { db } from '@/lib/db';

interface Props {
  album: Album;
  onClose: () => void;
}

const RING_COUNT = 4;

export default function BookPreviewOverlay({ album, onClose }: Props) {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [activePage, setActivePage] = useState<'cover' | 'events'>('cover');
  /** eventId → 표시할 썸네일 data URL (없으면 null) */
  const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setEvents(db.events.listByAlbum(album.id).slice(0, 6));
  }, [album.id]);

  /** events가 바뀔 때마다 썸네일 자동 선택 */
  useEffect(() => {
    if (events.length === 0) return;
    const map: Record<string, string | null> = {};
    for (const ev of events) {
      if (ev.thumbnail_url) {
        map[ev.id] = ev.thumbnail_url;
      } else {
        const photos = db.items
          .listByEvent(ev.id)
          .filter((i) => i.type === 'photo' && i.image_url);
        if (photos.length > 0) {
          const pick = photos[Math.floor(Math.random() * photos.length)];
          map[ev.id] = pick.image_url;
        } else {
          map[ev.id] = null;
        }
      }
    }
    setThumbnails(map);
  }, [events]);

  /** 오버레이 닫힘 애니메이션(200ms) 후 라우팅 */
  function navigateTo(url: string) {
    onClose();
    setTimeout(() => router.push(url), 200);
  }

  /** 이벤트 진입 전 sessionStorage에 복귀 플래그 저장 후 라우팅 */
  function navigateToEvent(eventId: string) {
    sessionStorage.setItem('ss:lastAlbumId', album.id);
    sessionStorage.setItem('ss:reopenAlbumOverlay', '1');
    onClose();
    setTimeout(() => router.push(`/event/${eventId}`), 200);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(7px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{
          opacity: { duration: 0.28 },
          scale: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
          y: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
          layout: { duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] },
        }}
        className="relative flex flex-col overflow-hidden"
        style={{
          width: isFullscreen ? '100vw' : 'min(92vw, 980px)',
          height: isFullscreen ? '100dvh' : 'clamp(380px, 72vh, 640px)',
          borderRadius: isFullscreen ? 0 : 8,
          boxShadow: isFullscreen
            ? 'none'
            : '0 40px 100px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* ── 모바일 탭 스트립 (md 미만에서만 표시) ── */}
        <div
          className="md:hidden flex flex-shrink-0"
          style={{ background: '#ece4d2', borderBottom: '1px solid rgba(0,0,0,0.1)' }}
        >
          {(['cover', 'events'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActivePage(tab)}
              style={{
                flex: 1,
                padding: '10px 0',
                fontSize: 12,
                fontWeight: 600,
                color: activePage === tab ? album.cover_color : '#7a6a5a',
                background: 'none',
                cursor: 'pointer',
                borderTop: 0,
                borderLeft: 0,
                borderRight: 0,
                borderBottom:
                  activePage === tab
                    ? `2.5px solid ${album.cover_color}`
                    : '2.5px solid transparent',
                transition: 'color 0.18s, border-color 0.18s',
              }}
            >
              {tab === 'cover' ? '표지' : '이벤트'}
            </button>
          ))}
        </div>

        {/* ── 메인 콘텐츠 행: 왼쪽 | 바인더 | 오른쪽 ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── 왼쪽 페이지 ── */}
          <motion.div
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.07, duration: 0.3, ease: 'easeOut' }}
            onClick={() => navigateTo(`/album/${album.id}`)}
            whileHover={{ backgroundColor: 'rgba(0,0,0,0.018)' }}
            className={`${
              activePage === 'events' ? 'hidden md:flex' : 'flex'
            } flex-col relative overflow-hidden w-full md:w-[42%] md:flex-none`}
            style={{
              background: 'linear-gradient(150deg, #f7f1e6 0%, #f1e9d8 100%)',
              cursor: 'pointer',
            }}
          >
            {/* 앨범 색상 스트립 */}
            <div
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 7,
                backgroundColor: album.cover_color, opacity: 0.9,
              }}
            />
            {/* 종이 노이즈 */}
            <div
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.011) 3px, rgba(0,0,0,0.011) 6px)',
              }}
            />
            {/* 바인더 방향 접힘 그림자 */}
            <div
              className="hidden md:block"
              style={{
                position: 'absolute', right: 0, top: 0, bottom: 0, width: 28,
                pointerEvents: 'none', zIndex: 1,
                background: 'linear-gradient(to right, transparent, rgba(0,0,0,0.14))',
              }}
            />

            <div className="flex flex-col h-full px-9 py-9 pl-11 relative z-10">
              {/* 표지 컬러 블록 */}
              <div
                className="w-full mb-6 flex items-end flex-shrink-0"
                style={{
                  height: 'clamp(120px, 28%, 200px)',
                  background: `linear-gradient(150deg, ${album.cover_color}e0 0%, ${album.cover_color}70 100%)`,
                  borderRadius: 4,
                  boxShadow: 'inset 0 -4px 10px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <span className="px-4 pb-4 text-3xl select-none" style={{ opacity: 0.5 }}>
                  📖
                </span>
              </div>

              <h2 className="text-xl font-bold text-ink leading-tight tracking-tight mb-2">
                {album.title}
              </h2>
              <p className="text-xs text-ink-muted mb-0.5">
                {new Date(album.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </p>
              <p className="text-xs text-ink-faint">이벤트 {events.length}개</p>

              <p className="mt-auto text-xs text-ink-faint" style={{ opacity: 0.55 }}>
                클릭하면 앨범으로 →
              </p>
            </div>
          </motion.div>

          {/* ── 바인더 / 스파인 (md+에서만) ── */}
          <div
            className="hidden md:flex flex-col items-center justify-evenly flex-shrink-0"
            style={{
              width: 30,
              position: 'relative',
              zIndex: 3,
              paddingTop: 28,
              paddingBottom: 28,
              background:
                'linear-gradient(to right, rgba(0,0,0,0.22) 0%, #6a5848 16%, #5a4838 50%, #6a5848 84%, rgba(0,0,0,0.18) 100%)',
            }}
          >
            {Array.from({ length: RING_COUNT }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 15,
                  borderRadius: 9999,
                  /* 링 홀을 약간 투명하게 → 스파인 배경이 비침 */
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.13) 100%)',
                  /* 금속 테두리 */
                  border: '2px solid #b2a898',
                  boxShadow:
                    /* 상단 하이라이트 */ 'inset 0 1.5px 1.5px rgba(255,255,255,0.32), ' +
                    /* 하단 그림자   */ 'inset 0 -1.5px 2px rgba(0,0,0,0.22), ' +
                    /* 드롭 섀도우   */ '0 2px 5px rgba(0,0,0,0.38)',
                }}
              />
            ))}
          </div>

          {/* ── 오른쪽 페이지 ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className={`${
              activePage === 'cover' ? 'hidden md:flex' : 'flex'
            } flex-1 flex-col relative overflow-hidden`}
            style={{ background: 'linear-gradient(150deg, #f3eadc 0%, #ece1cc 100%)' }}
          >
            {/* 바인더 방향 접힘 그림자 */}
            <div
              className="hidden md:block"
              style={{
                position: 'absolute', left: 0, top: 0, bottom: 0, width: 24,
                pointerEvents: 'none', zIndex: 1,
                background: 'linear-gradient(to left, transparent, rgba(0,0,0,0.10))',
              }}
            />
            {/* 종이 노이즈 */}
            <div
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage:
                  'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.007) 4px, rgba(0,0,0,0.007) 8px)',
              }}
            />

            <div className="h-full p-8 relative z-10 overflow-y-auto">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-widest mb-5">
                이벤트 목록
              </p>

              <AnimatePresence mode="wait">
                {events.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center"
                    style={{ height: '60%' }}
                  >
                    <p className="text-xs text-ink-faint">아직 이벤트가 없어요</p>
                  </motion.div>
                ) : (
                  <motion.div key="list" className="grid grid-cols-2 gap-3">
                    {events.map((event, i) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.03, boxShadow: '0 3px 10px rgba(0,0,0,0.14)' }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ delay: 0.18 + i * 0.055, duration: 0.24 }}
                        onClick={() => navigateToEvent(event.id)}
                        style={{
                          background: '#f8f2e8',
                          borderRadius: 3,
                          boxShadow: '0 1px 5px rgba(0,0,0,0.09)',
                          borderLeft: `3px solid ${album.cover_color}99`,
                          cursor: 'pointer',
                          display: 'flex',
                          overflow: 'hidden',
                        }}
                      >
                        {/* 썸네일 */}
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            flexShrink: 0,
                            background: '#ede5d4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                          }}
                        >
                          {thumbnails[event.id] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbnails[event.id]!}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <span style={{ fontSize: 20, opacity: 0.4 }}>🗓</span>
                          )}
                        </div>
                        {/* 텍스트 */}
                        <div style={{ padding: '8px 10px', minWidth: 0 }}>
                          <p className="text-xs font-semibold text-ink truncate leading-snug">
                            {event.title}
                          </p>
                          {event.date && (
                            <p className="text-xs text-ink-faint mt-0.5">
                              {new Date(event.date).toLocaleDateString('ko-KR', {
                                month: 'short', day: 'numeric',
                              })}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── 컨트롤 버튼 ── */}
        <div className="absolute top-3 right-3 flex gap-2 z-20">
          <button
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? '원래 크기로' : '전체화면'}
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.22)', color: '#f5f0e8cc',
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: 'none',
            }}
          >
            {isFullscreen ? '⊡' : '⊞'}
          </button>
          <button
            onClick={onClose}
            title="닫기 (Esc)"
            style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'rgba(0,0,0,0.22)', color: '#f5f0e8cc',
              fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', border: 'none',
            }}
          >
            ✕
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getContrastColor(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#2c2016' : '#f5f0e8';
}
