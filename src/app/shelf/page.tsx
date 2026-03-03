'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getUsername, clearUser } from '@/lib/db';
import { Album } from '@/lib/types';
import AlbumSpine from '@/components/AlbumSpine';
import BookPreviewOverlay from '@/components/BookPreviewOverlay';

const SPINE_COLORS = [
  '#c8a97e', '#8fbc8f', '#b08aba', '#7eafc8',
  '#c87e7e', '#c8c07e', '#7eb8c8', '#c8987e',
];

export default function ShelfPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [username, setUsernameState] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState(SPINE_COLORS[0]);
  const [previewAlbum, setPreviewAlbum] = useState<Album | null>(null);

  useEffect(() => {
    const name = getUsername();
    if (!name) { router.replace('/login'); return; }
    setUsernameState(name);
    const loaded = db.albums.list();
    setAlbums(loaded);

    // 이벤트에서 뒤로 왔을 때 오버레이 자동 복원
    const reopen = sessionStorage.getItem('ss:reopenAlbumOverlay');
    const lastAlbumId = sessionStorage.getItem('ss:lastAlbumId');
    if (reopen === '1' && lastAlbumId) {
      sessionStorage.setItem('ss:reopenAlbumOverlay', '0');
      const target = loaded.find((a) => a.id === lastAlbumId) ?? null;
      if (target) setPreviewAlbum(target);
    }
  }, [router]);

  function handleLogout() {
    clearUser();
    router.replace('/login');
  }

  function handleCreateAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const album = db.albums.create({ title: newTitle.trim(), cover_color: selectedColor });
    setAlbums((prev) => [...prev, album]);
    setNewTitle('');
    setShowNewForm(false);
  }

  function handleAlbumClick(album: Album) {
    setPreviewAlbum(album);
  }

  function handleClosePreview() {
    setPreviewAlbum(null);
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'linear-gradient(180deg, #2b1a0e 0%, #3d2510 40%, #4a2e14 100%)',
      }}
    >
      {/* 상단 바 */}
      <header className="flex items-center justify-between px-6 py-4">
        <h1 className="text-lg font-bold tracking-tight" style={{ color: '#f5f0e8cc' }}>
          📚 {username || 'Scrapshelf'}
        </h1>
        <button
          onClick={handleLogout}
          className="text-xs px-3 py-1.5 rounded transition-colors"
          style={{ color: '#f5f0e890', border: '1px solid #f5f0e830' }}
        >
          나가기
        </button>
      </header>

      {/* 책장 영역 */}
      <div className="flex-1 flex flex-col justify-end pb-0">
        {albums.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: '#f5f0e840' }}>
              + 버튼으로 첫 앨범을 추가해보세요
            </p>
          </div>
        )}

        <div className="relative w-full">
          <div className="flex items-end gap-1 px-8 pb-0 min-h-[240px] overflow-x-auto">
            <AnimatePresence>
              {albums.map((album) => {
                const isSelected = previewAlbum?.id === album.id;
                const isDimmed = previewAlbum && previewAlbum.id !== album.id;

                return (
                  <motion.div
                    key={album.id}
                    initial={{ y: 60, opacity: 0 }}
                    animate={{
                      y: isSelected ? -36 : 0,
                      scale: isSelected ? 1.12 : 1,
                      zIndex: isSelected ? 20 : 1,
                      opacity: isDimmed ? 0.25 : 1,
                      rotate: isSelected ? -1.2 : 0,
                    }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeOut' }}
                    style={{ transformOrigin: 'bottom center', willChange: 'transform' }}
                    whileHover={!previewAlbum ? { y: -10 } : undefined}
                  >
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <AlbumSpine album={album} onClick={() => handleAlbumClick(album)} />
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* 새 앨범 추가 버튼 */}
            <motion.button
              onClick={() => setShowNewForm(true)}
              whileHover={{ y: -8 }}
              className="flex items-center justify-center text-2xl select-none"
              style={{
                width: 48,
                height: 220,
                border: '2px dashed',
                borderColor: '#f5f0e830',
                borderRadius: '3px 6px 6px 3px',
                color: '#f5f0e840',
              }}
              title="새 앨범 추가"
            >
              +
            </motion.button>
          </div>

          {/* 선반 판자 */}
          <div
            style={{
              height: 20,
              background: 'linear-gradient(180deg, #8b5a2b 0%, #6b4220 60%, #4a2e14 100%)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
            }}
          />
          <div
            style={{
              height: 12,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)',
            }}
          />
        </div>
      </div>

      {/* 책 미리보기 오버레이 */}
      <AnimatePresence>
        {previewAlbum && (
          <BookPreviewOverlay
            key={previewAlbum.id}
            album={previewAlbum}
            onClose={handleClosePreview}
          />
        )}
      </AnimatePresence>

      {/* 새 앨범 모달 */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            onClick={(e) => e.target === e.currentTarget && setShowNewForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper w-full max-w-sm px-8 py-8"
              style={{ borderRadius: 2, boxShadow: '4px 4px 24px rgba(0,0,0,0.3)' }}
            >
              <h2 className="text-base font-bold text-ink mb-6">새 앨범 만들기</h2>
              <form onSubmit={handleCreateAlbum} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-widest">
                    앨범 제목
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full border-b border-ink-faint bg-transparent py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ink transition-colors"
                    placeholder="예: 제주도 여행 2024"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-2 uppercase tracking-widest">
                    표지 색상
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {SPINE_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className="w-7 h-7 transition-transform"
                        style={{
                          backgroundColor: color,
                          borderRadius: 2,
                          outline: selectedColor === color ? '2px solid #2c2016' : '2px solid transparent',
                          outlineOffset: 2,
                          transform: selectedColor === color ? 'scale(1.15)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="flex-1 py-2 text-sm text-ink-muted border border-ink-faint hover:bg-paper-dark transition-colors"
                    style={{ borderRadius: 2 }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-sm font-semibold text-paper bg-ink hover:bg-ink-muted transition-colors"
                    style={{ borderRadius: 2 }}
                  >
                    만들기
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
