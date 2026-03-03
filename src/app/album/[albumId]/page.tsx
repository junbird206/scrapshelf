'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getUsername } from '@/lib/db';
import { Album, Event } from '@/lib/types';

export default function AlbumPage() {
  const router = useRouter();
  const { albumId } = useParams<{ albumId: string }>();

  const [album, setAlbum] = useState<Album | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    if (!getUsername()) { router.replace('/login'); return; }
    const a = db.albums.get(albumId);
    if (!a) { router.replace('/shelf'); return; }
    setAlbum(a);
    setEvents(db.events.listByAlbum(albumId));
  }, [albumId, router]);

  function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const event = db.events.create({
      album_id: albumId,
      title: newTitle.trim(),
      date: newDate || null,
    });
    setEvents((prev) => [...prev, event]);
    setNewTitle('');
    setNewDate('');
    setShowNewForm(false);
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-muted text-sm animate-pulse">앨범을 펼치는 중...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-paper"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* 헤더 */}
      <header
        className="sticky top-0 z-10 px-6 py-4 flex items-center gap-4"
        style={{
          backgroundColor: album.cover_color,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={() => router.back()}
          className="text-sm font-medium hover:opacity-70 transition-opacity"
          style={{ color: '#2c2016aa' }}
        >
          ← 책장
        </button>
        <h1 className="flex-1 text-lg font-bold text-ink truncate">{album.title}</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="text-sm font-semibold px-3 py-1.5 bg-ink text-paper hover:opacity-80 transition-opacity"
          style={{ borderRadius: 2 }}
        >
          + 이벤트
        </button>
      </header>

      {/* 이벤트 그리드 */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-ink-faint text-sm">아직 이벤트가 없습니다</p>
            <button
              onClick={() => setShowNewForm(true)}
              className="text-sm text-ink-muted underline underline-offset-2"
            >
              첫 이벤트 추가하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <AnimatePresence>
              {events.map((event, i) => (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => router.push(`/event/${event.id}`)}
                  className="polaroid text-left cursor-pointer hover:-translate-y-1 transition-transform"
                  style={{ transform: `rotate(${(i % 5 - 2) * 1.2}deg)` }}
                >
                  <div
                    className="bg-paper-dark flex items-center justify-center text-ink-faint overflow-hidden"
                    style={{ width: '100%', aspectRatio: '4/3', fontSize: 28 }}
                  >
                    {event.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.thumbnail_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      '🗓'
                    )}
                  </div>
                  <div className="mt-1">
                    <p className="text-xs font-semibold text-ink truncate">{event.title}</p>
                    {event.date && (
                      <p className="text-xs text-ink-faint mt-0.5">
                        {new Date(event.date).toLocaleDateString('ko-KR', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* 새 이벤트 모달 */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={(e) => e.target === e.currentTarget && setShowNewForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-paper w-full max-w-sm px-8 py-8"
              style={{ borderRadius: 2, boxShadow: '4px 4px 24px rgba(0,0,0,0.2)' }}
            >
              <h2 className="text-base font-bold text-ink mb-6">새 이벤트 추가</h2>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-widest">
                    제목
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full border-b border-ink-faint bg-transparent py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ink transition-colors"
                    placeholder="예: 생일 파티"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-widest">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full border-b border-ink-faint bg-transparent py-2 text-sm text-ink focus:outline-none focus:border-ink transition-colors"
                  />
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
                    추가
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
