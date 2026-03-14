export interface AnswerEntry {
  inputId: string;
  value: string;
  underscoreCount: number;
}

export const processDocxHtml = (rawHtml: string): string => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  applyIndentation(doc);
  replaceUnderscoresWithInputs(doc);

  return doc.body.innerHTML;
};

const applyIndentation = (doc: Document): void => {
  doc.querySelectorAll('p').forEach((p) => {
    if (p.closest('blockquote')) {
      return;
    }

    const startsWithNbspEntity = p.innerHTML.startsWith('&nbsp;');
    const textContent = p.textContent ?? '';
    const startsWithNbspChar = textContent.startsWith('\u00a0');
    const startsWithWhitespace = /^\s+/.test(textContent);

    if (startsWithNbspEntity || startsWithNbspChar || startsWithWhitespace) {
      p.innerHTML = p.innerHTML
        .replace(/^(?:\s|&nbsp;|&#160;)+/i, '')
        .replace(/^\u00a0+/, '');
      p.style.paddingLeft = '1.5rem';
    }
  });

  doc.querySelectorAll('ol > p, ul > p').forEach((p) => {
    const li = doc.createElement('li');
    li.style.listStyle = 'none';
    li.style.paddingLeft = '1.5rem';
    p.parentNode?.insertBefore(li, p);
    li.appendChild(p);
  });

  doc.querySelectorAll('li + p, li + div, li + span').forEach((element) => {
    if ((element as HTMLElement).closest('blockquote')) {
      return;
    }

    (element as HTMLElement).style.paddingLeft = '1.5rem';
  });
};

const replaceUnderscoresWithInputs = (doc: Document): void => {
  let inputIndex = 0;

  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);

  const nodesToProcess: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    if (node.textContent && /_{3,}/.test(node.textContent)) {
      nodesToProcess.push(node as Text);
    }
    node = walker.nextNode();
  }

  nodesToProcess.forEach((textNode) => {
    const text = textNode.textContent ?? '';
    const parts = text.split(/(_{3,})/);

    if (parts.length <= 1) return;

    const fragment = doc.createDocumentFragment();

    parts.forEach((part) => {
      if (/^_{3,}$/.test(part)) {
        const width = Math.max(80, part.length * 10);
        const input = doc.createElement('input');
        input.type = 'text';
        input.dataset.answerInput = 'true';
        input.dataset.originalUnderscores = String(part.length);
        input.id = `answer-${inputIndex++}`;
        input.placeholder = '';
        input.style.cssText = [
          'display: inline-block',
          `width: ${width}px`,
          'border: none',
          'border-bottom: 1.5px solid currentColor',
          'outline: none',
          'background: transparent',
          'padding: 2px 4px',
          'font-size: inherit',
          'font-family: inherit',
          'color: inherit',
          'vertical-align: baseline',
          'margin: 0 2px',
        ].join(';');
        fragment.appendChild(input);
      } else if (part) {
        fragment.appendChild(doc.createTextNode(part));
      }
    });

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
};

export const collectAnswers = (containerEl: HTMLElement): AnswerEntry[] => {
  const inputs = containerEl.querySelectorAll<HTMLInputElement>('input[data-answer-input="true"]');

  return Array.from(inputs).map((input) => ({
    inputId: input.id,
    value: input.value.trim(),
    underscoreCount: parseInt(input.dataset.originalUnderscores ?? '0', 10),
  }));
};

export const hasUnansweredInputs = (containerEl: HTMLElement): boolean => {
  const inputs = containerEl.querySelectorAll<HTMLInputElement>('input[data-answer-input="true"]');
  return Array.from(inputs).some((input) => input.value.trim() === '');
};