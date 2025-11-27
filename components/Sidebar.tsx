import React from 'react';
import { Plus, FileText, Trash2, BookOpen, Save, Upload, User as UserIcon, LogOut } from 'lucide-react';
import { Sheet, User } from '../types';

interface SidebarProps {
  sheets: Sheet[];
  activeSheetId: string | null;
  onSelectSheet: (id: string) => void;
  onCreateSheet: () => void;
  onDeleteSheet: (e: React.MouseEvent, id: string) => void;
  onExport: () => void;
  onImport: () => void;
  user: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onCreateSheet,
  onDeleteSheet,
  onExport,
  onImport,
  user,
  onLogout,
}) => {
  return (
    <div className="w-64 bg-stone-100 dark:bg-stone-950 border-r border-stone-200 dark:border-stone-800 h-full flex flex-col flex-shrink-0 transition-colors duration-200">
      <div className="h-14 px-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          <h1 className="font-bold text-lg text-stone-800 dark:text-stone-100 tracking-tight">MathFrame</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wider mb-2 px-2 mt-2">
          Листы
        </div>
        {sheets.map((sheet) => (
          <div
            key={sheet.id}
            onClick={() => onSelectSheet(sheet.id)}
            className={`group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors ${
              activeSheetId === sheet.id
                ? 'bg-white dark:bg-stone-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-200/50 dark:hover:bg-stone-900 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <FileText className={`w-4 h-4 ${activeSheetId === sheet.id ? 'opacity-100' : 'opacity-70'}`} />
              <span className="truncate font-medium">{sheet.title || 'Безымянный лист'}</span>
            </div>
            <button
              onClick={(e) => onDeleteSheet(e, sheet.id)}
              className={`p-1 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                sheets.length === 1 ? 'hidden' : ''
              }`}
              title="Удалить лист"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-3 bg-stone-100 dark:bg-stone-950">
        <button
          onClick={onCreateSheet}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white py-2 px-4 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Новый лист
        </button>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 py-2 px-3 rounded-md text-xs font-medium border border-stone-200 dark:border-stone-700 transition-colors"
            title="Сохранить все листы в файл"
          >
            <Save className="w-3.5 h-3.5" />
            Сохранить
          </button>
          <button
            onClick={onImport}
            className="flex items-center justify-center gap-2 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 py-2 px-3 rounded-md text-xs font-medium border border-stone-200 dark:border-stone-700 transition-colors"
            title="Загрузить листы из файла"
          >
            <Upload className="w-3.5 h-3.5" />
            Открыть
          </button>
        </div>

        {user && (
           <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
                 <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-xs font-bold">{user.username}</span>
                    <span className="text-[10px] text-stone-500">Online</span>
                 </div>
              </div>
              <button 
                onClick={onLogout}
                className="p-1.5 rounded-md hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400"
                title="Выйти"
              >
                 <LogOut className="w-4 h-4" />
              </button>
           </div>
        )}
      </div>
    </div>
  );
};