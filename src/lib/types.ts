export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
};

export type Album = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_color: string;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Event = {
  id: string;
  album_id: string;
  user_id: string;
  title: string;
  date: string | null;
  description: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type ItemType = 'photo' | 'note' | 'receipt' | 'sticker';

export type Item = {
  id: string;
  event_id: string;
  user_id: string;
  type: ItemType;
  content: string | null;
  image_url: string | null;
  position_x: number;
  position_y: number;
  x: number;
  y: number;
  rotation: number;
  z_index: number;
  created_at: string;
};
