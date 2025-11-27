import { Sheet, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Имитация задержки сети
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Ключи для "базы данных" (localStorage, который имитирует БД сервера)
const DB_USERS_KEY = 'mathframe_db_users';
const DB_SHEETS_PREFIX = 'mathframe_db_sheets_';
const SESSION_KEY = 'mathframe_session_token';

// Начальный пример данных
const INITIAL_SHEET: Sheet = {
  id: 'init-sheet',
  title: 'Введение в MathFrame',
  blocks: [
    { id: 'b1', content: 'Добро пожаловать в **MathFrame**!' },
    { id: 'b2', content: 'Теперь ваши данные хранятся в облаке.' },
    { id: 'b3', content: '$$ E = mc^2 $$' }
  ],
  updatedAt: Date.now(),
};

class MockApi {
  // --- Auth ---

  async login(username: string, password: string): Promise<User> {
    await delay(600); // Сетевая задержка
    
    // Получаем пользователей из "БД"
    const usersRaw = localStorage.getItem(DB_USERS_KEY);
    const users = usersRaw ? JSON.parse(usersRaw) : {};
    
    const user = Object.values(users).find((u: any) => u.username === username && u.password === password) as any;
    
    if (!user) {
      throw new Error('Неверное имя пользователя или пароль');
    }
    
    const token = `token_${user.id}_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: user.id, token }));
    
    return { id: user.id, username: user.username, token };
  }

  async register(username: string, password: string): Promise<User> {
    await delay(800);
    
    const usersRaw = localStorage.getItem(DB_USERS_KEY);
    const users = usersRaw ? JSON.parse(usersRaw) : {};
    
    if (Object.values(users).some((u: any) => u.username === username)) {
      throw new Error('Пользователь с таким именем уже существует');
    }
    
    const newUser = {
      id: uuidv4(),
      username,
      password, // В реальном мире здесь был бы хеш
    };
    
    users[newUser.id] = newUser;
    localStorage.setItem(DB_USERS_KEY, JSON.stringify(users));
    
    // Создаем начальные данные для нового пользователя
    localStorage.setItem(DB_SHEETS_PREFIX + newUser.id, JSON.stringify([INITIAL_SHEET]));
    
    const token = `token_${newUser.id}_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: newUser.id, token }));
    
    return { id: newUser.id, username: newUser.username, token };
  }

  async logout(): Promise<void> {
    await delay(200);
    localStorage.removeItem(SESSION_KEY);
  }

  async checkAuth(): Promise<User | null> {
    await delay(300);
    const sessionRaw = localStorage.getItem(SESSION_KEY);
    if (!sessionRaw) return null;
    
    try {
      const session = JSON.parse(sessionRaw);
      const usersRaw = localStorage.getItem(DB_USERS_KEY);
      const users = usersRaw ? JSON.parse(usersRaw) : {};
      const user = users[session.userId];
      
      if (!user) return null;
      
      return { id: user.id, username: user.username, token: session.token };
    } catch {
      return null;
    }
  }

  // --- Data ---

  async getSheets(userId: string): Promise<Sheet[]> {
    await delay(500);
    const data = localStorage.getItem(DB_SHEETS_PREFIX + userId);
    return data ? JSON.parse(data) : [INITIAL_SHEET];
  }

  async saveSheets(userId: string, sheets: Sheet[]): Promise<void> {
    // В реальности мы бы сохраняли только изменения, но для мока сохраним всё целиком
    // Задержка минимальная, чтобы интерфейс не тормозил при частых сохранениях
    await delay(100); 
    localStorage.setItem(DB_SHEETS_PREFIX + userId, JSON.stringify(sheets));
  }
}

export const api = new MockApi();