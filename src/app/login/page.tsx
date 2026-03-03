'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUsername, setUsername } from '@/lib/db';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');

  useEffect(() => {
    if (getUsername()) router.replace('/shelf');
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setUsername(name.trim());
    router.push('/shelf');
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm bg-white px-8 py-10"
        style={{
          boxShadow: '4px 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
          borderRadius: 2,
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink tracking-tight">📚 Scrapshelf</h1>
          <p className="text-sm text-ink-muted mt-1">나만의 디지털 스크랩북 책장</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1 uppercase tracking-widest">
              닉네임
            </label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={20}
              className="w-full border-b border-ink-faint bg-transparent py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:border-ink transition-colors"
              placeholder="이름을 입력하세요"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold text-paper bg-ink hover:bg-ink-muted transition-colors"
            style={{ borderRadius: 2 }}
          >
            책장 열기
          </button>
        </form>
      </div>
    </div>
  );
}
