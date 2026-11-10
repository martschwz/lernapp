export type Profile = {
  id: string;
  name: string;
  avatar: string;
  grade: number; // 0 = erwachsen
  daily_goal: number;
  subjects: string[]; // "lang" | "math"
  pin_hash?: string | null; // PIN des Profils (gehasht), null = keine PIN
  created_at?: string;
};

export type Language = {
  id: string;
  name: string;
  short: string;
  tts: string | null;
  chars: string;
  info_label: string;
  lenient: boolean;
  color: string;
  default_dir: "de" | "fs";
  created_at?: string;
};

export type Unit = {
  id: string;
  profile_id: string;
  language_id: string;
  name: string;
  created_at?: string;
};

export type Card = {
  id: string;
  unit_id: string;
  term: string;
  translation: string;
  info: string;
  position: number;
  created_at?: string;
};

export type Progress = {
  profile_id: string;
  item_key: string;
  box: number;
  due: string;
  right_count: number;
  wrong_count: number;
};

export type Activity = {
  profile_id: string;
  day: string; // YYYY-MM-DD
  answers: number;
  correct: number;
};

export type FamilySettings = {
  owner: string;
  parent_pin_hash: string | null;
};

export type Tables = {
  family_settings: FamilySettings;
  profiles: Profile;
  languages: Language;
  units: Unit;
  cards: Card;
  progress: Progress;
  activity: Activity;
};
export type TableName = keyof Tables;
