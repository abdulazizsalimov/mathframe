
export interface Block {
  id: string;
  content: string;
}

export interface Sheet {
  id: string;
  title: string;
  blocks: Block[];
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  token: string;
}

export type BlockAction = 
  | { type: 'ADD'; afterId: string | null }
  | { type: 'UPDATE'; id: string; content: string }
  | { type: 'DELETE'; id: string }
  | { type: 'FOCUS'; id: string };
