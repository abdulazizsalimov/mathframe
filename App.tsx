
import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Sheet } from './types';
import { EditorBlock } from './components/EditorBlock';
import { renderTextWithMath } from './utils/katexUtils';
import { Sun, Moon, Eye, EyeOff, Download, Loader2, Plus, X, Save, Upload, BookOpen } from 'lucide-react';

// Declare html2pdf globally
declare var html2pdf: any;

const Header = ({ 
  isDarkMode, 
  toggleTheme, 
  showPreview,
  togglePreview,
  onDownloadPdf,
  isPdfLoading,
  onExport,
  onImport
}: { 
  isDarkMode: boolean; 
  toggleTheme: () => void; 
  showPreview: boolean;
  togglePreview: () => void;
  onDownloadPdf: () => void;
  isPdfLoading: boolean;
  onExport: () => void;
  onImport: () => void;
}) => (
  <header className="h-12 flex flex-shrink-0 items-center justify-between px-3 border-b border-stone-200 dark:border-stone-950 bg-stone-100 dark:bg-stone-800 z-10 transition-colors duration-200">
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 mr-4">
          <BookOpen className="w-5 h-5 text-indigo-500" />
          <h1 className="font-bold text-base text-stone-800 dark:text-stone-300 tracking-tight">MathFrame</h1>
      </div>
      
      <div className="h-5 w-px bg-stone-300 dark:bg-stone-600 mx-1"></div>

      <button
        onClick={onExport}
        className="flex items-center gap-2 px-2 py-1 rounded text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        title="Сохранить проект в файл"
      >
        <Save className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Сохранить</span>
      </button>

      <button
        onClick={onImport}
        className="flex items-center gap-2 px-2 py-1 rounded text-xs font-medium text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        title="Открыть проект из файла"
      >
        <Upload className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Открыть</span>
      </button>
    </div>

    <div className="flex items-center gap-1">
      <button 
        onClick={onDownloadPdf}
        disabled={isPdfLoading}
        className="p-1.5 rounded text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 dark:text-stone-400 transition-colors disabled:opacity-50"
        title="Скачать PDF"
      >
        {isPdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>

      <div className="w-px h-5 bg-stone-300 dark:bg-stone-600 mx-1"></div>

      <button 
        onClick={togglePreview}
        className={`p-1.5 rounded transition-colors flex items-center gap-2 ${
          showPreview 
            ? 'text-indigo-600 dark:text-indigo-500 bg-stone-200 dark:bg-stone-700' 
            : 'text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 dark:text-stone-400'
        }`}
        title={showPreview ? "Скрыть предпросмотр" : "Показать предпросмотр"}
      >
        {showPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      </button>

      <button 
        onClick={toggleTheme}
        className="p-1.5 rounded text-stone-500 hover:bg-stone-200 dark:hover:bg-stone-700 dark:text-stone-400 transition-colors"
        title="Переключить тему"
      >
        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </div>
  </header>
);

const App: React.FC = () => {
  // --- Data State ---
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  
  // --- UI State ---
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  
  // --- Clipboard & History ---
  const [clipboard, setClipboard] = useState<string | null>(null);
  const [history, setHistory] = useState<Sheet[][]>([]);

  // --- Theme State ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem('mathframe-theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // --- Initialization ---
  useEffect(() => {
    const savedData = localStorage.getItem('mathframe-sheets');
    if (savedData) {
      try {
        const parsedSheets = JSON.parse(savedData);
        if (Array.isArray(parsedSheets) && parsedSheets.length > 0) {
          setSheets(parsedSheets);
          setActiveSheetId(parsedSheets[0].id);
        } else {
           createInitialSheet();
        }
      } catch (e) {
        createInitialSheet();
      }
    } else {
      createInitialSheet();
    }
  }, []);

  const createInitialSheet = () => {
    const newBlockId = uuidv4();
    const newSheet: Sheet = {
      id: uuidv4(),
      title: 'Новый лист',
      blocks: [{ id: newBlockId, content: '' }],
      updatedAt: Date.now(),
    };
    setSheets([newSheet]);
    setActiveSheetId(newSheet.id);
  };

  // --- Theme Effect ---
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('mathframe-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('mathframe-theme', 'light');
    }
  }, [isDarkMode]);

  // --- Auto-save Effect ---
  useEffect(() => {
    if (sheets.length > 0) {
      localStorage.setItem('mathframe-sheets', JSON.stringify(sheets));
    }
  }, [sheets]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0];

  // --- History Management ---
  const saveHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = [...prev, sheets];
      if (newHistory.length > 50) return newHistory.slice(newHistory.length - 50);
      return newHistory;
    });
  }, [sheets]);

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const previousSheets = prev[prev.length - 1];
      const newHistory = prev.slice(0, -1);
      setSheets(previousSheets);
      return newHistory;
    });
  }, []);

  // --- File I/O ---

  const handleExportData = () => {
    const dataStr = JSON.stringify(sheets, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mathframe_project_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedSheets = JSON.parse(event.target?.result as string);
          if (Array.isArray(importedSheets)) {
            saveHistory();
            setSheets(importedSheets);
            if (importedSheets.length > 0) {
               setActiveSheetId(importedSheets[0].id);
            }
          } else {
            alert("Неверный формат файла");
          }
        } catch (err) {
          alert("Ошибка при чтении файла");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- PDF Export ---
  const handleDownloadPdf = async () => {
    if (!activeSheet || typeof html2pdf === 'undefined') return;
    
    setIsPdfGenerating(true);

    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;

    document.body.style.overflow = 'visible';
    document.body.style.height = 'auto';

    const container = document.createElement('div');
    container.id = 'pdf-gen-container';
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '100000',
      backgroundColor: '#ffffff',
      overflowY: 'scroll',
      padding: '40px',
      boxSizing: 'border-box',
    });

    const content = document.createElement('div');
    Object.assign(content.style, {
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      color: '#000000',
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      backgroundColor: '#ffffff',
    });

    const title = document.createElement('h1');
    title.innerText = activeSheet.title || 'Документ';
    Object.assign(title.style, {
      fontSize: '32px',
      fontWeight: 'bold',
      marginBottom: '24px',
      color: '#000000',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '12px',
    });
    content.appendChild(title);

    activeSheet.blocks.forEach(block => {
        const blockDiv = document.createElement('div');
        Object.assign(blockDiv.style, {
          marginBottom: '16px',
          color: '#000000',
          fontSize: '16px',
          lineHeight: '1.6',
          minHeight: '1.6em'
        });
        
        if (block.content) {
            blockDiv.innerHTML = renderTextWithMath(block.content);
        } else {
            blockDiv.innerHTML = '&nbsp;';
        }
        
        const allElements = blockDiv.getElementsByTagName('*');
        for (let i = 0; i < allElements.length; i++) {
           const el = allElements[i] as HTMLElement;
           el.style.color = '#000000';
           el.style.backgroundColor = 'transparent';
        }

        content.appendChild(blockDiv);
    });

    container.appendChild(content);
    document.body.appendChild(container);

    const appRoot = document.getElementById('root');
    if (appRoot) appRoot.style.visibility = 'hidden';

    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
        const opt = {
          margin:       15,
          filename:     `${(activeSheet.title || 'document').replace(/\s+/g, '_')}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            windowWidth: 1200,
            scrollY: 0
          },
          jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(content).save();
    } catch (e) {
        console.error("PDF Export failed", e);
        alert("Ошибка при создании PDF");
    } finally {
        document.body.style.overflow = originalOverflow;
        document.body.style.height = originalHeight;

        if (appRoot) appRoot.style.visibility = 'visible';
        if (document.body.contains(container)) {
            document.body.removeChild(container);
        }
        setIsPdfGenerating(false);
    }
  };

  // --- Sheet Operations ---
  const createSheet = () => {
    saveHistory();
    const newBlockId = uuidv4();
    const newSheet: Sheet = {
      id: uuidv4(),
      title: 'Новый лист',
      blocks: [{ id: newBlockId, content: '' }],
      updatedAt: Date.now(),
    };
    setSheets(prev => [...prev, newSheet]);
    setActiveSheetId(newSheet.id);
    setSelectedBlockId(newBlockId);
  };

  const deleteSheet = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sheets.length <= 1) return;
    saveHistory();
    
    const newSheets = sheets.filter(s => s.id !== id);
    setSheets(newSheets);
    if (activeSheetId === id) {
      setActiveSheetId(newSheets[0].id);
      setSelectedBlockId(null);
    }
  };

  const updateSheetTitle = (title: string) => {
    setSheets(prev => prev.map(s => 
      s.id === activeSheetId ? { ...s, title, updatedAt: Date.now() } : s
    ));
  };

  // --- Block Operations ---
  const updateBlock = (blockId: string, content: string) => {
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newBlocks = s.blocks.map(b => b.id === blockId ? { ...b, content } : b);
      return { ...s, blocks: newBlocks, updatedAt: Date.now() };
    }));
  };

  const addBlock = (currentBlockId: string) => {
    if (!activeSheet) return;
    const index = activeSheet.blocks.findIndex(b => b.id === currentBlockId);
    if (index === -1) return;

    const nextBlock = activeSheet.blocks[index + 1];
    if (nextBlock && nextBlock.content.trim() === '') {
        setSelectedBlockId(nextBlock.id);
        return;
    }
    
    saveHistory();
    const newBlockId = uuidv4();
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newBlock = { id: newBlockId, content: '' };
      const newBlocks = [...s.blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      return { ...s, blocks: newBlocks, updatedAt: Date.now() };
    }));
    setTimeout(() => setSelectedBlockId(newBlockId), 0);
  };

  const deleteBlock = (blockId: string) => {
    if (!activeSheet) return;
    if (activeSheet.blocks.length <= 1) return; 

    const index = activeSheet.blocks.findIndex(b => b.id === blockId);
    if (index === -1) return;

    saveHistory();
    const prevBlockId = index > 0 ? activeSheet.blocks[index - 1].id : activeSheet.blocks[index + 1].id;
    
    setSheets(prev => prev.map(s => {
      if (s.id !== activeSheetId) return s;
      const newBlocks = s.blocks.filter(b => b.id !== blockId);
      return { ...s, blocks: newBlocks, updatedAt: Date.now() };
    }));
    setSelectedBlockId(prevBlockId);
  };

  const navigateBlock = (currentId: string, direction: -1 | 1) => {
    if (!activeSheet) return;
    const index = activeSheet.blocks.findIndex(b => b.id === currentId);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < activeSheet.blocks.length) {
      setSelectedBlockId(activeSheet.blocks[newIndex].id);
    }
  };

  // --- Clipboard Operations ---
  const copyBlock = (content: string) => {
    setClipboard(content);
    navigator.clipboard.writeText(content).catch(() => {});
  };

  const cutBlock = (blockId: string, content: string) => {
    copyBlock(content);
    deleteBlock(blockId);
  };

  const pasteBlock = (targetBlockId: string) => {
    if (!clipboard || !activeSheet) return;
    const index = activeSheet.blocks.findIndex(b => b.id === targetBlockId);
    if (index === -1) return;
    const targetBlock = activeSheet.blocks[index];
    saveHistory();

    if (targetBlock.content.trim() !== '') {
      const newBlockId = uuidv4();
      setSheets(prev => prev.map(s => {
        if (s.id !== activeSheetId) return s;
        const newBlock = { id: newBlockId, content: clipboard };
        const newBlocks = [...s.blocks];
        newBlocks.splice(index + 1, 0, newBlock);
        return { ...s, blocks: newBlocks, updatedAt: Date.now() };
      }));
      setTimeout(() => setSelectedBlockId(newBlockId), 0);
    } else {
      updateBlock(targetBlockId, clipboard);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSheetTitle(e.target.value);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-300 font-sans transition-colors duration-200">
      
      {isPdfGenerating && (
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col gap-4 text-white">
          <Loader2 className="w-12 h-12 animate-spin" />
          <span className="text-xl font-medium">Генерация PDF...</span>
        </div>
      )}

      <Header 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
        showPreview={showPreview}
        togglePreview={() => setShowPreview(!showPreview)}
        onDownloadPdf={handleDownloadPdf}
        isPdfLoading={isPdfGenerating}
        onExport={handleExportData}
        onImport={handleImportData}
      />

      {/* Tabs Bar */}
      <div className="flex items-center w-full bg-stone-100 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-950 overflow-x-auto pt-0 flex-shrink-0">
         <div className="flex flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-stone-600">
            {sheets.map(sheet => (
              <div 
                  key={sheet.id}
                  onClick={() => setActiveSheetId(sheet.id)}
                  className={`group relative flex items-center gap-2 px-3 py-2 text-xs font-medium cursor-pointer transition-colors border-r border-stone-200 dark:border-stone-700 min-w-[120px] max-w-[180px] h-9 select-none
                    ${activeSheetId === sheet.id
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border-t-2 border-t-indigo-500'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'}
                  `}
              >
                  <span className="truncate flex-1">{sheet.title || 'Untitled'}</span>
                  
                  {(sheets.length > 1) && (
                    <button
                      onClick={(e) => deleteSheet(e, sheet.id)}
                      className={`p-0.5 rounded-sm hover:bg-stone-300 dark:hover:bg-stone-600 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 opacity-0 group-hover:opacity-100 ${activeSheetId === sheet.id ? 'opacity-100' : ''}`}
                    >
                        <X className="w-3 h-3" />
                    </button>
                  )}
              </div>
            ))}
         </div>
         
         <button 
           onClick={createSheet}
           className="px-3 h-9 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors border-l border-stone-200 dark:border-stone-700"
           title="Новый лист"
         >
            <Plus className="w-4 h-4" />
         </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-stone-900 relative">
        {activeSheet ? (
            <div className="max-w-3xl mx-auto px-8 py-8 min-h-full" id="content-area">
              <input
                type="text"
                value={activeSheet.title}
                onChange={handleTitleChange}
                placeholder="Заголовок листа"
                className="w-full text-3xl font-bold text-stone-900 dark:text-stone-100 placeholder:text-stone-300 dark:placeholder:text-stone-600 border-none outline-none bg-transparent mb-6 tracking-tight"
              />

              <div 
                className="space-y-1"
                role="grid"
                aria-label="Редактор содержимого"
              >
                {activeSheet.blocks.map((block) => (
                  <EditorBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    showPreview={showPreview}
                    onSelect={() => setSelectedBlockId(block.id)}
                    onUpdate={(content) => updateBlock(block.id, content)}
                    onAddNext={() => addBlock(block.id)}
                    onDelete={() => deleteBlock(block.id)}
                    onNavigate={(dir) => navigateBlock(block.id, dir)}
                    onCopy={() => copyBlock(block.content)}
                    onCut={() => cutBlock(block.id, block.content)}
                    onPaste={() => pasteBlock(block.id)}
                    onUndo={handleUndo}
                  />
                ))}
              </div>
              
              <div 
                className="h-32 cursor-text" 
                onClick={() => {
                   if (activeSheet.blocks.length > 0) {
                       const lastBlock = activeSheet.blocks[activeSheet.blocks.length - 1];
                       if (lastBlock.content !== '') {
                          addBlock(lastBlock.id);
                       } else {
                          setSelectedBlockId(lastBlock.id);
                       }
                   }
                }} 
              />
            </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-400">
            Загрузка...
          </div>
        )}
      </div>
    </div>
  );
};

export default App;