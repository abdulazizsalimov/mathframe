
/**
 * Returns the x, y coordinates of the caret in a textarea.
 * This is a simplified implementation of properties mirroring.
 */
export const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
  const {
    top,
    left,
  } = element.getBoundingClientRect();

  // Create a mirror div
  const div = document.createElement('div');
  const style = div.style;
  const computed = window.getComputedStyle(element);

  // Copy styles
  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.overflow = 'hidden';

  const properties = [
    'direction',
    'boxSizing',
    'width',
    'height',
    'overflowX',
    'overflowY',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'fontSizeAdjust',
    'lineHeight',
    'fontFamily',
    'textAlign',
    'textTransform',
    'textIndent',
    'textDecoration',
    'letterSpacing',
    'wordSpacing',
  ];

  properties.forEach((prop) => {
    // @ts-ignore
    style[prop] = computed[prop];
  });

  // Firefox needs this
  // @ts-ignore
  if (window.mozInnerScreenX != null) {
    if (element.scrollHeight > parseInt(computed.height))
      style.overflowY = 'scroll';
  } else {
    style.overflow = 'hidden'; 
  }

  div.textContent = element.value.substring(0, position);
  
  // The span is the specific anchor for the cursor
  const span = document.createElement('span');
  span.textContent = element.value.substring(position) || '.'; 
  div.appendChild(span);

  document.body.appendChild(div);
  
  const spanRect = span.getBoundingClientRect();
  const divRect = div.getBoundingClientRect();
  
  // Calculate relative coordinates
  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth),
    height: parseInt(computed.lineHeight)
  };

  document.body.removeChild(div);

  return coordinates;
};
