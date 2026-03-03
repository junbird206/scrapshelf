/**
 * localStorage 기반 CRUD 레이어.
 * Supabase 없이 브라우저 단독으로 동작하는 MVP용.
 * 브라우저(기기)별로 데이터가 독립 저장됨.
 */

import { Album, Event, Item, ItemType } from './types';

const KEY = {
  albums:   'ss:albums',
  events:   'ss:events',
  items:    'ss:items',
  userId:   'ss:userId',
  username: 'ss:username',
} as const;

function uid(): string {
  return crypto.randomUUID();
}

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]');
  } catch {
    return [];
  }
}

function save<T>(key: string, items: T[]): void {
  localStorage.setItem(key, JSON.stringify(items));
}

// ─── Auth (닉네임 기반) ───────────────────────────────────────

export function getUserId(): string {
  let id = localStorage.getItem(KEY.userId);
  if (!id) {
    id = uid();
    localStorage.setItem(KEY.userId, id);
  }
  return id;
}

export function getUsername(): string | null {
  return localStorage.getItem(KEY.username);
}

export function setUsername(name: string): void {
  localStorage.setItem(KEY.username, name);
  getUserId(); // userId도 확보
}

export function clearUser(): void {
  localStorage.removeItem(KEY.username);
}

// ─── DB ──────────────────────────────────────────────────────

export const db = {
  albums: {
    list(): Album[] {
      return load<Album>(KEY.albums).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    },

    get(id: string): Album | null {
      return load<Album>(KEY.albums).find((a) => a.id === id) ?? null;
    },

    create(data: { title: string; cover_color: string }): Album {
      const now = new Date().toISOString();
      const album: Album = {
        id: uid(),
        user_id: getUserId(),
        title: data.title,
        description: null,
        cover_color: data.cover_color,
        cover_image_url: null,
        created_at: now,
        updated_at: now,
      };
      save(KEY.albums, [...load<Album>(KEY.albums), album]);
      return album;
    },

    delete(id: string): void {
      // cascade
      const events = load<Event>(KEY.events).filter((e) => e.album_id === id);
      events.forEach((e) => db.items.deleteByEvent(e.id));
      save(KEY.events, load<Event>(KEY.events).filter((e) => e.album_id !== id));
      save(KEY.albums, load<Album>(KEY.albums).filter((a) => a.id !== id));
    },
  },

  events: {
    listByAlbum(albumId: string): Event[] {
      return load<Event>(KEY.events)
        .filter((e) => e.album_id === albumId)
        .sort((a, b) => (a.date ?? a.created_at).localeCompare(b.date ?? b.created_at));
    },

    get(id: string): Event | null {
      return load<Event>(KEY.events).find((e) => e.id === id) ?? null;
    },

    create(data: { album_id: string; title: string; date: string | null }): Event {
      const event: Event = {
        id: uid(),
        album_id: data.album_id,
        user_id: getUserId(),
        title: data.title,
        date: data.date,
        description: null,
        thumbnail_url: null,
        created_at: new Date().toISOString(),
      };
      save(KEY.events, [...load<Event>(KEY.events), event]);
      return event;
    },

    setThumbnail(id: string, url: string | null): void {
      save(
        KEY.events,
        load<Event>(KEY.events).map((e) =>
          e.id === id ? { ...e, thumbnail_url: url } : e,
        ),
      );
    },

    delete(id: string): void {
      db.items.deleteByEvent(id);
      save(KEY.events, load<Event>(KEY.events).filter((e) => e.id !== id));
    },
  },

  items: {
    listByEvent(eventId: string): Item[] {
      return load<Item>(KEY.items)
        .filter((i) => i.event_id === eventId)
        .sort((a, b) => a.z_index - b.z_index);
    },

    create(data: {
      event_id: string;
      type: ItemType;
      content: string;
      image_url?: string | null;
      rotation: number;
      position_x: number;
      position_y: number;
      x: number;
      y: number;
      z_index: number;
    }): Item {
      const item: Item = {
        id: uid(),
        event_id: data.event_id,
        user_id: getUserId(),
        type: data.type,
        content: data.content,
        image_url: data.image_url ?? null,
        position_x: data.position_x,
        position_y: data.position_y,
        x: data.x,
        y: data.y,
        rotation: data.rotation,
        z_index: data.z_index,
        created_at: new Date().toISOString(),
      };
      save(KEY.items, [...load<Item>(KEY.items), item]);
      return item;
    },

    updatePosition(id: string, x: number, y: number): void {
      save(
        KEY.items,
        load<Item>(KEY.items).map((i) =>
          i.id === id ? { ...i, x, y } : i,
        ),
      );
    },

    delete(id: string): void {
      save(KEY.items, load<Item>(KEY.items).filter((i) => i.id !== id));
    },

    deleteByEvent(eventId: string): void {
      save(KEY.items, load<Item>(KEY.items).filter((i) => i.event_id !== eventId));
    },
  },
};
