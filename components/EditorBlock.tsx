import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Copy, Plus } from 'lucide-react';
import { Block } from '../types';
import { renderTextWithMath, isCursorInMathMode } from '../utils/katexUtils';
import { highlightLatex } from '../utils/syntaxHighlight';
import { LATEX_COMMANDS, LATEX_ENVIRONMENTS } from '../utils/latexData';
import { getCaretCoordinates } from '../utils/domUtils';

interface EditorBlockProps {
  block: Block;
  isSelected: boolean;
  showPreview: boolean;
  onUpdate: (content: string) => void;
  onAddNext: () => void;
  onDelete: () => void;
  onSelect: () => void;
  onNavigate: (direction: -1 | 1) => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onUndo: () => void;
}

const INDENT = '    '; // 4 spaces

export const EditorBlock: React.FC<EditorBlockProps> = ({
  block,
  isSelected,
  showPreview,
  onUpdate,
  onAddNext,
  onDelete,
  onSelect,
  onNavigate,
  onCopy,
  onCut,
  onPaste,
  onUndo,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autocomplete State
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [triggerType, setTriggerType] = useState<'command' | 'environment' | null>(null);

  // Preview Positioning State
  const [previewOnTop, setPreviewOnTop] = useState(true);

  const listboxId = `suggestions-${block.id}`;

  // Focus management
  useEffect(() => {
    if (isSelected && !isEditing) {
      setTimeout(() => containerRef.current?.focus(), 0);
    }
  }, [isSelected, isEditing]);

  useEffect(() => {
    if (isSelected && isEditing && textareaRef.current) {
      if (document.activeElement !== textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [isSelected, isEditing]);

  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
      setShowSuggestions(false);
    }
  }, [isSelected]);

  // Scroll active suggestion into view
  useEffect(() => {
    if (showSuggestions) {
      const activeEl = document.getElementById(`${listboxId}-opt-${suggestionIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [suggestionIndex, showSuggestions, listboxId]);

  // Determine Preview position (Smart positioning)
  useLayoutEffect(() => {
    if (showPreview && isEditing && containerRef.current) {
       const rect = containerRef.current.getBoundingClientRect();
       // If less than 160px space above, put it below
       setPreviewOnTop(rect.top > 160);
    }
  }, [showPreview, isEditing, block.content]);

  // Auto-resize textarea
  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [block.content, isEditing]);

  const getCurrentWord = (text: string, cursorIndex: number) => {
    const textBefore = text.slice(0, cursorIndex);
    const commandMatch = textBefore.match(/\\([a-zA-Z]*)$/);
    if (commandMatch) {
      if (commandMatch[1] === '' && commandMatch.index! > 0 && textBefore[commandMatch.index! - 1] === '\\') {
        return null;
      }
      return { word: commandMatch[1], type: 'command' as const, index: commandMatch.index! };
    }
    const envMatch = textBefore.match(/\\(begin|end)\{([a-zA-Z]*)$/);
    if (envMatch) {
      const word = envMatch[2];
      const braceIndex = textBefore.lastIndexOf('{');
      return { word: word, type: 'environment' as const, index: braceIndex };
    }
    return null;
  };

  const updateSuggestions = (text: string, cursorIndex: number) => {
    const inMath = isCursorInMathMode(text, cursorIndex);
    if (!inMath) {
      setShowSuggestions(false);
      return;
    }

    const match = getCurrentWord(text, cursorIndex);
    if (match) {
      let list: string[] = [];
      if (match.type === 'command') {
        list = LATEX_COMMANDS.filter(cmd => cmd.startsWith(match.word));
      } else if (match.type === 'environment') {
        list = LATEX_ENVIRONMENTS.filter(env => env.startsWith(match.word));
      }

      if (list.length > 0) {
        setSuggestions(list);
        setSuggestionIndex(0);
        setShowSuggestions(true);
        setTriggerType(match.type);
        if (textareaRef.current) {
          const coords = getCaretCoordinates(textareaRef.current, cursorIndex);
          setSuggestionPos({ top: coords.top + coords.height, left: coords.left });
        }
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (suggestion: string) => {
    if (!textareaRef.current) return;
    const text = block.content;
    const cursorIndex = textareaRef.current.selectionStart;
    const match = getCurrentWord(text, cursorIndex);

    if (match) {
      const prefix = match.type === 'command' ? '\\' : '{';
      
      let suffix = '';
      let cursorOffset = 0;

      // Smart templates for commands
      if (match.type === 'command') {
        if (suggestion === 'frac') {
            suffix = '{}{}';
            cursorOffset = 1; // Move cursor into first brace
        } else if (['begin', 'end', 'sqrt', 'text', 'mathbf', 'mathit', 'mathcal', 'mathbb'].includes(suggestion)) {
            suffix = '{}';
            cursorOffset = 1; // Move cursor into brace
        }
      }

      const before = text.slice(0, match.index);
      const after = text.slice(cursorIndex);
      const newContent = before + prefix + suggestion + suffix + after;
      
      onUpdate(newContent);
      setShowSuggestions(false);
      
      setTimeout(() => {
        if (textareaRef.current) {
           const newCursorPos = match.index + 1 + suggestion.length + cursorOffset; // +1 for the prefix char
           textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
           textareaRef.current.focus();
        }
      }, 0);
    }
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate(1);
    } else if (e.key === 'Backspace') {
      if (block.content === '') {
        e.preventDefault();
        onDelete();
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      onDelete();
    } else if ((e.ctrlKey || e.metaKey)) {
      if (e.code === 'KeyC') {
        e.preventDefault();
        onCopy();
      } else if (e.code === 'KeyX') {
        e.preventDefault();
        onCut();
      } else if (e.code === 'KeyV') {
        e.preventDefault();
        onPaste();
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        onUndo();
      }
    }
  };

  const insertAtCursor = (textToInsert: string, cursorOffset: number = 0) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const text = block.content;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const newContent = before + textToInsert + after;
    onUpdate(newContent);
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = cursor + textToInsert.length + cursorOffset;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        return;
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // 1. Smart Closing Bracket Skip (Overtype)
    const CLOSING_CHARS = [')', '}', ']', '$'];
    if (CLOSING_CHARS.includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && textareaRef.current) {
      const cursor = textareaRef.current.selectionStart;
      const text = block.content;
      if (cursor < text.length && text[cursor] === e.key) {
        e.preventDefault();
        const newPos = cursor + 1;
        textareaRef.current.setSelectionRange(newPos, newPos);
        return;
      }
    }

    // 2. Auto-close pairs
    const PAIRS: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
    if (Object.keys(PAIRS).includes(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const open = e.key;
      const close = PAIRS[open];
      insertAtCursor(open + close, -1);
      return;
    }

    if (e.key === 'Backspace') {
      if (textareaRef.current) {
        const cursor = textareaRef.current.selectionStart;
        if (cursor > 0 && textareaRef.current.selectionEnd === cursor) {
          const text = block.content;
          const charBefore = text[cursor - 1];
          const charAfter = text[cursor];
          const isParenPair = charBefore === '(' && charAfter === ')';
          const isBracePair = charBefore === '{' && charAfter === '}';
          const isBracketPair = charBefore === '[' && charAfter === ']';
          const isDollarPair = charBefore === '$' && charAfter === '$';
          if (isParenPair || isBracePair || isBracketPair || isDollarPair) {
            e.preventDefault();
            const newContent = text.slice(0, cursor - 1) + text.slice(cursor + 1);
            onUpdate(newContent);
            setTimeout(() => {
              if (textareaRef.current) {
                textareaRef.current.setSelectionRange(cursor - 1, cursor - 1);
              }
            }, 0);
            return;
          }
        }
      }
      if (block.content === '') {
        e.preventDefault();
        onDelete();
        return;
      }
    }

    if (e.key === 'Tab' && !showSuggestions && !e.shiftKey) {
      const cursor = textareaRef.current?.selectionStart || 0;
      const text = block.content;
      const before = text.slice(0, cursor);
      const after = text.slice(cursor);

      if (before.endsWith('$$')) {
        e.preventDefault();
        const lastLineBreak = before.lastIndexOf('\n', before.length - 3); 
        const lineStart = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
        const lineText = before.slice(lineStart);
        const currentIndent = lineText.match(/^\s*/)?.[0] || '';
        const expansion = `\n${currentIndent}${INDENT}\n${currentIndent}$$`;
        const newContent = before + expansion + after;
        onUpdate(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            const offset = 1 + currentIndent.length + INDENT.length;
            const newPos = cursor + offset;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      if (before.endsWith('$') && !before.endsWith('$$')) {
        e.preventDefault();
        const expansion = '$';
        const newContent = before + expansion + after;
        onUpdate(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = cursor;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      const envMatch = before.match(/\\begin\{([a-zA-Z0-9*]+)\}$/);
      if (envMatch) {
        e.preventDefault();
        const envName = envMatch[1];
        const matchStart = envMatch.index!;
        const lastLineBreak = before.lastIndexOf('\n', matchStart);
        const lineStart = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
        const lineToCursor = before.slice(lineStart, cursor);
        const currentIndent = lineToCursor.match(/^\s*/)?.[0] || '';
        const expansion = `\n${currentIndent}${INDENT}\n${currentIndent}\\end{${envName}}`;
        const newContent = before + expansion + after;
        onUpdate(newContent);
        setTimeout(() => {
          if (textareaRef.current) {
            const offset = 1 + currentIndent.length + INDENT.length;
            const newPos = cursor + offset;
            textareaRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }

      if (textareaRef.current && isCursorInMathMode(block.content, cursor)) {
          const match = getCurrentWord(block.content, cursor);
          if (match) {
            let list: string[] = [];
            if (match.type === 'command') list = LATEX_COMMANDS.filter(c => c.startsWith(match.word));
            else if (match.type === 'environment') list = LATEX_ENVIRONMENTS.filter(e => e.startsWith(match.word));
            if (list.length === 1) {
              e.preventDefault();
              applySuggestion(list[0]);
              return;
            }
          }
      }
    }

    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const cursor = textareaRef.current?.selectionStart || 0;
      const text = block.content;
      const before = text.slice(0, cursor);
      const after = text.slice(cursor);
      const lastLineBreak = before.lastIndexOf('\n');
      const lineStart = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
      const currentLine = before.slice(lineStart);
      const baseIndent = currentLine.match(/^\s*/)?.[0] || '';
      const trimmedLine = currentLine.trimEnd();
      const shouldIncreaseIndent = trimmedLine.endsWith('{') || trimmedLine.endsWith('[') || /\\begin\{[^}]+\}$/.test(trimmedLine);
      const newIndent = shouldIncreaseIndent ? baseIndent + INDENT : baseIndent;
      const textToInsert = '\n' + newIndent;
      const newContent = before + textToInsert + after;
      onUpdate(newContent);
      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = cursor + textToInsert.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
          textareaRef.current.blur();
          textareaRef.current.focus();
        }
      }, 0);
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditing(false);
      setShowSuggestions(false);
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onAddNext();
    } 
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate(e.target.value);
    updateSuggestions(e.target.value, e.target.selectionStart);
  };

  return (
    <div role="row" className="group relative w-full mb-1">
      {/* Кнопки вынесены и жестко скрыты от скринридеров */}
      {!isEditing && (
        <div className="absolute top-1 right-2 z-20 pointer-events-none">
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="pointer-events-auto p-1.5 rounded bg-white dark:bg-stone-800 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 shadow-sm border border-stone-200 dark:border-stone-700 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Копировать блок (Ctrl+C)"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <div className="absolute -bottom-3 left-0 right-0 flex justify-center z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <button
          onClick={(e) => { e.stopPropagation(); onAddNext(); }}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-auto p-1 rounded-full bg-stone-200/80 dark:bg-stone-700/80 text-stone-500 dark:text-stone-400 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white shadow-sm transition-colors border border-stone-300 dark:border-stone-600"
          title="Добавить блок снизу"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div 
        role="gridcell"
        aria-selected={isSelected}
        ref={containerRef}
        tabIndex={isSelected ? 0 : -1} 
        onKeyDown={handleContainerKeyDown}
        onClick={() => onSelect()} 
        className={`relative w-full min-h-[2rem] rounded transition-colors duration-150 outline-none
          ${isSelected 
            ? 'bg-stone-100 dark:bg-stone-800 ring-1 ring-stone-300 dark:ring-stone-600' 
            : 'hover:bg-stone-50 dark:hover:bg-stone-900 border border-transparent'}
        `}
      >
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l z-10"></div>
        )}

        <div className="px-4 py-2 relative" onClick={(e) => { e.stopPropagation(); onSelect(); setIsEditing(true); }}>
          {isEditing ? (
            <div className="relative isolate">
              {showPreview && block.content && !showSuggestions && (
                <div 
                  className={`absolute left-0 z-50 w-full max-w-full pointer-events-none ${previewOnTop ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                  aria-hidden="true"
                >
                  <div className="w-fit max-w-full bg-white/95 dark:bg-stone-800/95 backdrop-blur-sm p-3 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                    <div 
                      className="prose prose-stone dark:prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: renderTextWithMath(block.content) }} 
                    />
                  </div>
                </div>
              )}

              {showSuggestions && (
                <div 
                  id={listboxId}
                  role="listbox"
                  aria-label="Подсказки LaTeX"
                  className="absolute z-50 w-48 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md shadow-lg overflow-hidden flex flex-col max-h-48"
                  style={{ top: suggestionPos.top, left: suggestionPos.left }}
                >
                  <div className="overflow-y-auto">
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={suggestion}
                        id={`${listboxId}-opt-${idx}`}
                        role="option"
                        aria-selected={idx === suggestionIndex}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); applySuggestion(suggestion); }}
                        className={`w-full text-left px-3 py-1.5 text-sm font-mono cursor-pointer transition-colors
                          ${idx === suggestionIndex 
                            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100' 
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}
                        `}
                      >
                         <span className="opacity-50 mr-1">{triggerType === 'command' ? '\\' : ''}</span>
                         {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div 
                className="absolute inset-0 z-0 pointer-events-none whitespace-pre-wrap break-words font-mono text-base leading-relaxed"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightLatex(block.content) }}
              />

              <textarea
                ref={textareaRef}
                value={block.content}
                onChange={handleChange}
                onKeyDown={handleTextareaKeyDown}
                onSelect={(e) => { if(isEditing) updateSuggestions(block.content, e.currentTarget.selectionStart); }}
                className="relative z-10 w-full resize-none bg-transparent outline-none font-mono text-base leading-relaxed overflow-hidden block text-transparent caret-stone-900 dark:caret-stone-100 selection:bg-indigo-500/30 selection:text-transparent"
                placeholder="Пишите здесь..."
                rows={1}
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                aria-autocomplete="list"
                aria-controls={showSuggestions ? listboxId : undefined}
                aria-expanded={showSuggestions}
                aria-activedescendant={showSuggestions ? `${listboxId}-opt-${suggestionIndex}` : undefined}
              />
            </div>
          ) : (
            <div
              className="prose prose-stone dark:prose-invert max-w-none text-base leading-relaxed min-h-[1.5rem]"
              dangerouslySetInnerHTML={{ __html: renderTextWithMath(block.content) }}
            />
          )}
          
          {!isEditing && !block.content && (
            <div className="absolute top-2 left-4 text-stone-300 dark:text-stone-700 pointer-events-none select-none italic text-sm placeholder-text">
              Пустая строка
            </div>
          )}
        </div>
      </div>
    </div>
  );
};