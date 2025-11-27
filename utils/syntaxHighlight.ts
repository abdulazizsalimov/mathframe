
/**
 * Simple LaTeX syntax highlighter.
 * Tokenizes the input string and returns HTML string with Tailwind color classes.
 */

// Colors for different token types
const COLORS = {
  command: 'text-indigo-600 dark:text-indigo-400 font-medium', // \frac, \alpha
  keyword: 'text-purple-600 dark:text-purple-400 font-bold',   // \begin, \end
  delimiter: 'text-amber-600 dark:text-amber-500',              // $$, $
  bracket: 'text-yellow-600 dark:text-yellow-500',              // { } [ ] ( )
  number: 'text-emerald-600 dark:text-emerald-400',             // 0-9
  comment: 'text-stone-400 dark:text-stone-500 italic',         // % comment
  text: 'text-stone-900 dark:text-stone-100',                   // Regular text
};

export const highlightLatex = (code: string): string => {
  if (!code) return '<br/>';

  // Helper to escape HTML to prevent XSS and rendering issues
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  // Regex to split code into tokens
  // 1. Comments: % ...
  // 2. Delimiters: $$ or $
  // 3. Commands: \word
  // 4. Backslash: \ (isolated)
  // 5. Brackets: { } [ ] ( )
  // 6. Numbers: 0-9
  // 7. Everything else (Text)
  
  // NOTE: Added |(\\) to capture isolated backslashes so they are rendered
  const regex = /(%[^\n]*)|(\$\$?)|(\\[a-zA-Z]+)|(\\)|([{}()[\]])|(\d+)|([^%$\\(){}[\]\d]+)/g;

  let match;
  let html = '';

  // Reset regex index just in case
  regex.lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    // match indices:
    // 0: full match
    // 1: comment
    // 2: delimiter
    // 3: command
    // 4: backslash (isolated)
    // 5: bracket
    // 6: number
    // 7: other (text)
    const [fullMatch, comment, delimiter, command, backslash, bracket, number, other] = match;

    if (comment) {
      html += `<span class="${COLORS.comment}">${escapeHtml(comment)}</span>`;
    } else if (delimiter) {
      html += `<span class="${COLORS.delimiter}">${escapeHtml(delimiter)}</span>`;
    } else if (command) {
      // Check for specific keywords
      const isKeyword = command === '\\begin' || command === '\\end';
      const colorClass = isKeyword ? COLORS.keyword : COLORS.command;
      html += `<span class="${colorClass}">${escapeHtml(command)}</span>`;
    } else if (backslash) {
      // Render isolated backslash with command color (or text color if preferred)
      html += `<span class="${COLORS.command}">${escapeHtml(backslash)}</span>`;
    } else if (bracket) {
      html += `<span class="${COLORS.bracket}">${escapeHtml(bracket)}</span>`;
    } else if (number) {
      html += `<span class="${COLORS.number}">${escapeHtml(number)}</span>`;
    } else if (other) {
      html += `<span class="${COLORS.text}">${escapeHtml(other)}</span>`;
    }
  }

  // Handle trailing newline for pre-wrap to render correctly
  if (code.endsWith('\n')) {
    html += '<br/>';
  }

  return html;
};
