
import katex from 'katex';
import { marked } from 'marked';

// Функция для транскрибации LaTeX в русский текст для скринридеров
const latexToRussian = (latex: string): string => {
  if (!latex) return '';
  let text = latex;

  // Убираем $$ и $ для чистого парсинга
  text = text.replace(/\$\$/g, '').replace(/\$/g, '');
  text = text.trim();

  // --- 0. Предварительная обработка сложных стрелок (\xRightarrow[sub]{sup}) ---
  // Обрабатываем до основных замен, так как они имеют аргументы {}
  
  // \xRightarrow[sub]{sup} или \xRightarrow{sup}
  while (/\\xRightarrow/.test(text)) {
    const prev = text;
    text = text.replace(/\\xRightarrow(?:\[(.*?)\])?\{((?:[^{}]|\{[^}]*\})*)\}/g, (m, sub, sup) => {
        let res = ' следует ';
        if (sup) res += ` с условием ${latexToRussian(sup)} `;
        if (sub) res += ` и подписью ${latexToRussian(sub)} `;
        return res;
    });
    // Fallback для пустых \xRightarrow{}
    text = text.replace(/\\xRightarrow\{\}/g, ' следует ');
    // Fallback для \xRightarrow без аргументов (если пользователь не дописал)
    text = text.replace(/\\xRightarrow\b/g, ' следует ');
    
    if (text === prev) break;
  }

  // \xrightarrow[sub]{sup}
  while (/\\xrightarrow/.test(text)) {
    const prev = text;
    text = text.replace(/\\xrightarrow(?:\[(.*?)\])?\{((?:[^{}]|\{[^}]*\})*)\}/g, (m, sub, sup) => {
        let res = ' переходит в ';
        if (sup) res += ` ${latexToRussian(sup)} `;
        if (sub) res += ` (${latexToRussian(sub)}) `;
        return res;
    });
    text = text.replace(/\\xrightarrow\{\}/g, ' переходит в ');
    text = text.replace(/\\xrightarrow\b/g, ' переходит в ');
    if (text === prev) break;
  }


  // --- 1. Обработка Окружений (Матрицы, Системы) ---
  const envRegex = /\\begin\{([a-zA-Z]+)\}([\s\S]*?)\\end\{\1\}/g;
  text = text.replace(envRegex, (match, envName, content) => {
    // Очищаем контент от лишних пробелов и переносов
    const cleanContent = content.trim();
    // Разбиваем на строки по \\ (учитываем возможные пробелы)
    const rows = cleanContent.split(/\\\\/).filter(r => r.trim().length > 0);
    
    let description = '';
    let startPhrase = '';
    
    switch (envName) {
      case 'pmatrix':
        startPhrase = 'Матрица в круглых скобках';
        break;
      case 'bmatrix':
        startPhrase = 'Матрица в квадратных скобках';
        break;
      case 'vmatrix':
        startPhrase = 'Определитель';
        break;
      case 'matrix':
        startPhrase = 'Матрица';
        break;
      case 'cases':
        startPhrase = 'Система условий';
        break;
      case 'align':
      case 'equation':
        startPhrase = 'Система уравнений';
        break;
      default:
        startPhrase = `Окружение ${envName}`;
    }

    description += `${startPhrase}. `;
    
    const rowTexts = rows.map((row, index) => {
      // Разбиваем строку на ячейки по &
      const cells = row.split('&').map(cell => latexToRussian(cell.trim()));
      
      if (envName === 'cases') {
         // Для cases обычно: значение & условие
         if (cells.length > 1) {
            return `Случай ${index + 1}: ${cells[0]}, если ${cells[1]}`;
         }
         return `Случай ${index + 1}: ${cells[0]}`;
      } else {
         // Для матриц перечисляем элементы
         return `Строка ${index + 1}: ${cells.join(', ')}`;
      }
    });

    description += rowTexts.join('. ');
    description += `. Конец ${startPhrase.toLowerCase()}.`;
    return description;
  });

  // --- 2. Рекурсивные структуры ---

  // Дроби: \frac{num}{den}
  while (/\\frac\{/.test(text)) {
    const previousText = text;
    text = text.replace(/\\frac\{((?:[^{}]|\{[^}]*\})*)\}\{((?:[^{}]|\{[^}]*\})*)\}/g, (m, num, den) => {
       return ` дробь: числитель ${latexToRussian(num)}, знаменатель ${latexToRussian(den)}, конец дроби `;
    });
    if (text === previousText) break;
  }

  // Корни: \sqrt{...}
  while (/\\sqrt\{/.test(text)) {
    const previousText = text;
    text = text.replace(/\\sqrt\{((?:[^{}]|\{[^}]*\})*)\}/g, (m, val) => {
      return ` квадратный корень из ${latexToRussian(val)} `;
    });
    if (text === previousText) break;
  }
  text = text.replace(/\\sqrt\b/g, ' корень ');

  // --- 3. Степени и индексы ---
  
  text = text.replace(/\^2/g, ' в квадрате ');
  text = text.replace(/\^3/g, ' в кубе ');
  
  while (/\^\{/.test(text)) {
    const previousText = text;
    text = text.replace(/\^\{((?:[^{}]|\{[^}]*\})*)\}/g, (m, val) => {
      return ` в степени ${latexToRussian(val)} `;
    });
    if (text === previousText) break;
  }
  
  text = text.replace(/\^([a-zA-Z0-9])/g, ' в степени $1 ');

  while (/_\{/.test(text)) {
    const previousText = text;
    text = text.replace(/_\{((?:[^{}]|\{[^}]*\})*)\}/g, (m, val) => {
      return ` с индексом ${latexToRussian(val)} `;
    });
    if (text === previousText) break;
  }

  text = text.replace(/_([a-zA-Z0-9])/g, ' с индексом $1 ');

  // --- 4. Словарь символов ---
  const replacements: Record<string, string> = {
    // Операторы
    '+': ' плюс ',
    '-': ' минус ',
    '=': ' равно ',
    '\\times': ' умножить ',
    '\\cdot': ' умножить ',
    '\\div': ' разделить ',
    '\\pm': ' плюс-минус ',
    '\\mp': ' минус-плюс ',
    '\\approx': ' примерно равно ',
    '\\neq': ' не равно ',
    '\\leq': ' меньше или равно ',
    '\\le': ' меньше или равно ',
    '\\geq': ' больше или равно ',
    '\\ge': ' больше или равно ',
    '\\to': ' стремится к ',
    '\\rightarrow': ' следует ',
    '\\Rightarrow': ' влечет ',
    '\\leftrightarrow': ' равносильно ',
    
    // Множества и логика
    '\\in': ' принадлежит ',
    '\\notin': ' не принадлежит ',
    '\\subset': ' подмножество ',
    '\\cup': ' объединение ',
    '\\cap': ' пересечение ',
    '\\forall': ' для всех ',
    '\\exists': ' существует ',
    '\\emptyset': ' пустое множество ',
    
    // Анализ
    '\\sum': ' сумма ',
    '\\prod': ' произведение ',
    '\\int': ' интеграл ',
    '\\infty': ' бесконечность ',
    '\\partial': ' частная производная ',
    '\\nabla': ' набла ',
    
    // Греческие буквы
    '\\alpha': ' альфа ', '\\beta': ' бета ', '\\gamma': ' гамма ', '\\delta': ' дельта ',
    '\\epsilon': ' эпсилон ', '\\zeta': ' дзета ', '\\eta': ' эта ', '\\theta': ' тета ',
    '\\lambda': ' лямбда ', '\\mu': ' мю ', '\\nu': ' ню ', '\\xi': ' кси ',
    '\\pi': ' пи ', '\\rho': ' ро ', '\\sigma': ' сигма ', '\\tau': ' тау ',
    '\\phi': ' фи ', '\\chi': ' хи ', '\\psi': ' пси ', '\\omega': ' омега ',
    '\\Delta': ' Дельта ', '\\Gamma': ' Гамма ', '\\Lambda': ' Лямбда ',
    '\\Sigma': ' Сигма ', '\\Phi': ' Фи ', '\\Psi': ' Пси ', '\\Omega': ' Омега ',
  };

  const sortedKeys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    text = text.replace(regex, replacements[key]);
  }

  // --- 4.5 Чтение латинских букв (переменных) ---
  // Делаем это ПОСЛЕ замены команд, чтобы не сломать \alpha -> \альфа (тут нет латиницы) 
  // Но нужно быть осторожным, чтобы не заменить буквы внутри уже русских слов.
  // Так как мы заменяем только ОДИНОЧНЫЕ латинские буквы, окруженные границами слов, риск минимален.
  
  const variables: Record<string, string> = {
      'x': ' икс ', 'y': ' игрек ', 'z': ' зет ',
      'a': ' а ', 'b': ' бэ ', 'c': ' цэ ', 'd': ' дэ ', 'e': ' е ', 'f': ' эф ',
      'g': ' жэ ', 'h': ' аш ', 'i': ' и ', 'j': ' йот ', 'k': ' ка ', 'l': ' эль ',
      'm': ' эм ', 'n': ' эн ', 'o': ' о ', 'p': ' пэ ', 'q': ' ку ', 'r': ' эр ',
      's': ' эс ', 't': ' тэ ', 'u': ' у ', 'v': ' вэ ', 'w': ' дубль-вэ '
  };

  // Регулярка ищет одиночные буквы a-zA-Z, перед которыми нет обратного слеша (чтобы не ломать команды, если какие-то остались)
  // и которые не являются частью длинных слов.
  text = text.replace(/(?<!\\)\b([a-zA-Z])\b/g, (match, char) => {
      const lower = char.toLowerCase();
      if (variables[lower]) return variables[lower];
      return match;
  });

  // --- 5. Скобки и очистка ---
  text = text.replace(/\(/g, ' скобка открывается ');
  text = text.replace(/\)/g, ' скобка закрывается ');
  text = text.replace(/\[/g, ' квадратная скобка открывается ');
  text = text.replace(/\]/g, ' квадратная скобка закрывается ');
  
  text = text.replace(/\\/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();

  return text;
};

/**
 * Renders a string containing mixed text and LaTeX into an HTML string.
 */
export const renderTextWithMath = (text: string): string => {
  if (!text) return '<br/>';

  const mathBlocks: { id: string; html: string }[] = [];
  
  const maskAndRenderMath = (content: string, isBlock: boolean) => {
    const id = `MATH_BLOCK_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const katexHtml = katex.renderToString(content, {
        displayMode: isBlock,
        throwOnError: false,
        output: 'html', 
      });

      const russianText = latexToRussian(content);

      let accessibleHtml = '';

      if (isBlock) {
        accessibleHtml = `
          <div class="w-full text-center my-3 select-text flex justify-center items-center" role="img" aria-label="${russianText}">
            <span aria-hidden="true">${katexHtml}</span>
          </div>
        `;
      } else {
        accessibleHtml = `
          <span class="inline-block align-middle select-text" role="img" aria-label="${russianText}">
            <span aria-hidden="true">${katexHtml}</span>
          </span>
        `;
      }

      mathBlocks.push({ id, html: accessibleHtml });
      return id;
    } catch (e) {
      return `<span class="text-red-500">Error rendering math</span>`;
    }
  };

  // Заменяем $$...$$
  let protectedText = text.replace(/(^|\n)[ \t]*\$\$([\s\S]*?)\$\$/g, (match, prefix, mathContent) => {
    return (prefix || '') + maskAndRenderMath(mathContent, true);
  });
  
  protectedText = protectedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
    return maskAndRenderMath(mathContent, true);
  });

  // Заменяем $...$
  protectedText = protectedText.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
    return maskAndRenderMath(mathContent, false);
  });

  let html = marked.parse(protectedText, { breaks: true, async: false }) as string;

  mathBlocks.forEach(({ id, html: mathHtml }) => {
    html = html.replace(id, mathHtml);
  });

  return html;
};

export const isCursorInMathMode = (text: string, cursorIndex: number): boolean => {
  let inMath = false;
  let isBlock = false;
  
  for (let i = 0; i < cursorIndex; i++) {
    const char = text[i];
    const next = text[i+1];

    if (char === '\\') {
      i++;
      continue;
    }

    if (char === '$') {
      if (next === '$') {
        if (inMath && isBlock) {
          inMath = false;
          isBlock = false;
        } else if (!inMath) {
          inMath = true;
          isBlock = true;
        }
        i++; 
      } else {
        if (inMath && !isBlock) {
          inMath = false;
        } else if (!inMath) {
          inMath = true;
        }
      }
    }
  }
  return inMath;
};
