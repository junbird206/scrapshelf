'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, getUsername } from '@/lib/db';
import { Event, Item, ItemType } from '@/lib/types';
import PolaroidCard from '@/components/PolaroidCard';
import ReceiptCard from '@/components/ReceiptCard';
import CropConfirmModal from '@/components/CropConfirmModal';

// ── 기존 아이템에 x/y 없을 때 기본 좌표 계산 ──────────────────────
function defaultXY(item: Item, index: number): { x: number; y: number } {
  if (typeof item.x === 'number' && typeof item.y === 'number') return { x: item.x, y: item.y };
  const col = index % 2;
  const row = Math.floor(index / 2);
  return { x: col * 180 + 20, y: row * 280 + 20 };
}

// ── ScrapItemWrapper ───────────────────────────────────────────────
interface WrapperProps {
  item: Item;
  isEditing: boolean;
  onLongPress: () => void;
  onDelete: () => void;
  onDragEnd: (x: number, y: number) => void;
}

function ScrapItemWrapper({ item, isEditing, onLongPress, onDelete, onDragEnd }: WrapperProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  function handlePointerDown() {
    if (isEditing) return; // 이미 편집 중이면 롱프레스 무시
    isDragging.current = false;
    longPressTimer.current = setTimeout(() => {
      onLongPress();
    }, 400);
  }

  function handlePointerMove() {
    // 약간이라도 움직이면 롱프레스 취소
    isDragging.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerUp() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  return (
    <motion.div
      drag={isEditing}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const nx = item.x + info.offset.x;
        const ny = item.y + info.offset.y;
        onDragEnd(nx, ny);
      }}
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        cursor: isEditing ? 'grab' : 'default',
        zIndex: isEditing ? 100 : item.z_index + 1,
        touchAction: isEditing ? 'none' : 'auto',
        userSelect: 'none',
      }}
      animate={isEditing ? { scale: 1.06 } : { scale: 1 }}
      transition={{ duration: 0.18 }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 편집 모드 테두리 */}
      {isEditing && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 6,
            border: '2px dashed rgba(122,92,62,0.7)',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* 삭제 버튼 */}
      {isEditing && (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
            width: 22,
            height: 22,
            borderRadius: '50%',
            backgroundColor: '#e05555',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            lineHeight: 1,
            zIndex: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }}
        >
          ×
        </button>
      )}

      {item.type === 'photo' && <PolaroidCard item={item} />}
      {item.type === 'receipt' && <ReceiptCard item={item} />}
      {(item.type === 'note' || item.type === 'sticker') && <NoteCard item={item} />}
    </motion.div>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────
export default function EventPage() {
  const router = useRouter();
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newType, setNewType] = useState<ItemType>('note');
  const [newContent, setNewContent] = useState('');
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [newPrintedItemId, setNewPrintedItemId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getUsername()) { router.replace('/login'); return; }
    const ev = db.events.get(eventId);
    if (!ev) { router.back(); return; }
    setEvent(ev);

    // 기존 아이템에 x/y 없으면 자동 좌표 보정
    const loaded = db.items.listByEvent(eventId);
    const patched = loaded.map((item, i) => {
      const { x, y } = defaultXY(item, i);
      return { ...item, x, y };
    });
    setItems(patched);
  }, [eventId, router]);

  // ESC → 편집 모드 해제
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setEditingId(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function resetForm() {
    setNewContent('');
    setNewType('note');
    setShowNewForm(false);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const objectUrl = URL.createObjectURL(file);
    setShowNewForm(false);
    setCropSrc(objectUrl);
  }

  function handleCropConfirm(dataUrl: string) {
    const idx = items.length;
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = col * 180 + 20 + Math.floor(Math.random() * 30);
    const y = row * 280 + 20 + Math.floor(Math.random() * 30);

    const item = db.items.create({
      event_id: eventId,
      type: 'photo',
      content: '',
      image_url: dataUrl,
      rotation: (Math.random() - 0.5) * 7,
      position_x: x,
      position_y: y,
      x,
      y,
      z_index: items.length,
    });
    setItems((prev) => [...prev, item]);
    setNewPrintedItemId(item.id);

    if (!event?.thumbnail_url) {
      db.events.setThumbnail(eventId, dataUrl);
      setEvent((prev) => prev ? { ...prev, thumbnail_url: dataUrl } : prev);
    }

    setCropSrc(null);
  }

  function handleCropCancel() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  function handleCreateItem(e: React.FormEvent) {
    e.preventDefault();
    if (newType === 'photo') return;
    if (!newContent.trim()) return;

    const idx = items.length;
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = col * 180 + 20 + Math.floor(Math.random() * 30);
    const y = row * 280 + 20 + Math.floor(Math.random() * 30);

    const item = db.items.create({
      event_id: eventId,
      type: newType,
      content: newContent.trim(),
      rotation: (Math.random() - 0.5) * 10,
      position_x: x,
      position_y: y,
      x,
      y,
      z_index: items.length,
    });
    setItems((prev) => [...prev, item]);
    resetForm();
  }

  function handleDeleteItem(id: string) {
    db.items.delete(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (id === newPrintedItemId) setNewPrintedItemId(null);
    if (id === editingId) setEditingId(null);
  }

  function handleDragEnd(id: string, nx: number, ny: number) {
    db.items.updatePosition(id, nx, ny);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, x: nx, y: ny } : i)),
    );
  }

  // 보드 영역 클릭 → 편집 모드 해제
  function handleBoardClick() {
    if (editingId) setEditingId(null);
  }

  // 아이템 최대 y 기준 보드 높이
  const boardH = items.length === 0
    ? 'calc(100vh - 64px)'
    : `${Math.max(600, ...items.map((i) => i.y + 320))}px`;

  if (!event) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <p className="text-ink-muted text-sm animate-pulse">페이지를 펼치는 중...</p>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-paper"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-paper border-b border-paper-shadow px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push('/shelf')}
          aria-label="뒤로"
          style={{
            width: 36, height: 36, borderRadius: 8,
            backgroundColor: '#7a5c3e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: 'none', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11.5 3.5L6 9l5.5 5.5" stroke="#f5f0e8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink truncate">{event.title}</h1>
          {event.date && (
            <p className="text-xs text-ink-muted">
              {new Date(event.date).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          )}
        </div>

        {editingId ? (
          <button
            onClick={() => setEditingId(null)}
            className="text-sm font-semibold px-3 py-1.5 transition-opacity"
            style={{ borderRadius: 2, background: '#7a5c3e', color: '#f5f0e8' }}
          >
            완료
          </button>
        ) : (
          <button
            onClick={() => setShowNewForm(true)}
            className="text-sm font-semibold px-3 py-1.5 bg-ink text-paper hover:opacity-80 transition-opacity"
            style={{ borderRadius: 2 }}
          >
            + 스크랩
          </button>
        )}
      </header>

      {/* 스크랩북 보드 */}
      <main
        className="relative w-full"
        style={{ minHeight: boardH }}
        onClick={handleBoardClick}
      >
        {items.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-ink-faint text-sm">아직 스크랩이 없어요</p>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewForm(true); }}
              className="text-sm text-ink-muted underline underline-offset-2"
            >
              첫 스크랩 추가하기
            </button>
          </div>
        )}

        {/* 격자 배경 */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(44,32,22,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(44,32,22,0.04) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* 편집 모드 힌트 */}
        <AnimatePresence>
          {editingId && (
            <motion.div
              key="edit-hint"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(44,32,22,0.82)',
                color: '#f5f0e8',
                fontSize: 12,
                padding: '6px 16px',
                borderRadius: 20,
                zIndex: 200,
                pointerEvents: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              드래그해서 위치 조정 · 빈 곳 탭하면 완료
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {items.map((item, i) => {
            const isPrinting = item.id === newPrintedItemId;
            return (
              <motion.div
                key={item.id}
                initial={
                  isPrinting
                    ? { opacity: 0, y: -32, scale: 0.94 }
                    : { opacity: 0, scale: 0.8 }
                }
                animate={
                  isPrinting
                    ? { opacity: 1, y: 0, scale: 1 }
                    : { opacity: 1, scale: 1, y: 0 }
                }
                exit={{ scale: 0.8, opacity: 0 }}
                transition={
                  isPrinting
                    ? {
                        opacity: { duration: 0.22 },
                        y: { type: 'spring', stiffness: 190, damping: 15, mass: 0.85 },
                        scale: { duration: 0.42, ease: [0.34, 1.5, 0.64, 1] },
                      }
                    : { delay: i * 0.04, duration: 0.25 }
                }
                onAnimationComplete={() => {
                  if (isPrinting) setNewPrintedItemId(null);
                }}
                style={{ position: 'absolute', top: 0, left: 0 }}
              >
                <ScrapItemWrapper
                  item={item}
                  isEditing={editingId === item.id}
                  onLongPress={() => setEditingId(item.id)}
                  onDelete={() => handleDeleteItem(item.id)}
                  onDragEnd={(nx, ny) => handleDragEnd(item.id, nx, ny)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </main>

      {/* 새 스크랩 모달 */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-paper w-full max-w-sm px-8 py-8"
              style={{ borderRadius: 2, boxShadow: '4px 4px 24px rgba(0,0,0,0.2)' }}
            >
              <h2 className="text-base font-bold text-ink mb-5">스크랩 추가</h2>
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-2 uppercase tracking-widest">
                    종류
                  </label>
                  <div className="flex gap-2">
                    {(['note', 'receipt', 'photo', 'sticker'] as ItemType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setNewType(t); setNewContent(''); }}
                        className="flex-1 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: newType === t ? '#2c2016' : '#b0a09060',
                          backgroundColor: newType === t ? '#2c2016' : 'transparent',
                          color: newType === t ? '#f5f0e8' : '#7a6a5a',
                        }}
                      >
                        {{ note: '메모', receipt: '영수증', photo: '사진', sticker: '스티커' }[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {newType === 'photo' ? (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border border-dashed border-ink-faint flex flex-col items-center justify-center gap-2 hover:border-ink transition-colors"
                      style={{ borderRadius: 2, height: 100, background: '#faf6ef' }}
                    >
                      <span style={{ fontSize: 26 }}>📷</span>
                      <span className="text-xs text-ink-faint">탭해서 사진 선택</span>
                    </button>
                    <p className="text-xs text-ink-faint mt-2 text-center">
                      선택하면 구도 조정 화면이 열려요
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-widest">
                      내용
                    </label>
                    <textarea
                      autoFocus
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      required
                      rows={4}
                      className="w-full border border-ink-faint bg-white px-3 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ink transition-colors resize-none"
                      style={{ borderRadius: 2 }}
                      placeholder={
                        newType === 'receipt' ? '아이템1 ₩1,000\n아이템2 ₩2,000'
                          : newType === 'sticker' ? '😊'
                            : '여기에 메모를 적어보세요...'
                      }
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 py-2 text-sm text-ink-muted border border-ink-faint hover:bg-paper-dark transition-colors"
                    style={{ borderRadius: 2 }}
                  >
                    취소
                  </button>
                  {newType !== 'photo' && (
                    <button
                      type="submit"
                      className="flex-1 py-2 text-sm font-semibold text-paper bg-ink hover:bg-ink-muted transition-colors"
                      style={{ borderRadius: 2 }}
                    >
                      붙이기
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 크롭 모달 */}
      <AnimatePresence>
        {cropSrc && (
          <CropConfirmModal
            key="crop"
            src={cropSrc}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NoteCard({ item }: { item: Item }) {
  const isSticker = item.type === 'sticker';
  return (
    <div
      style={{
        transform: `rotate(${item.rotation}deg)`,
        width: isSticker ? 80 : 160,
        minHeight: isSticker ? 80 : 120,
        backgroundColor: isSticker ? 'transparent' : '#fffef0',
        boxShadow: isSticker ? 'none' : '2px 3px 10px rgba(0,0,0,0.12)',
        padding: isSticker ? 0 : '12px',
        display: 'flex',
        alignItems: isSticker ? 'center' : 'flex-start',
        justifyContent: isSticker ? 'center' : 'flex-start',
        fontSize: isSticker ? 40 : 12,
        color: '#2c2016',
        fontFamily: isSticker ? undefined : 'var(--font-geist-mono)',
        lineHeight: isSticker ? 1 : 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {item.content}
    </div>
  );
}
