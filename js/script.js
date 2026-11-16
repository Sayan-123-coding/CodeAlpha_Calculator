/**
 * NEXUS – Smart Calculator | script.js
 * ================================================================
 * A clean, modular, feature-rich calculator engine:
 *   - Safe expression parser (no eval / no Function())
 *   - Tokenizer → Shunting-Yard → AST Evaluator
 *   - Full keyboard support
 *   - Calculation history with persistence
 *   - Live preview of partial results
 *   - Theme toggle with localStorage persistence
 *   - Sound effects (Web Audio API)
 *   - Ripple click animation
 *   - Toast notifications
 *   - Clipboard copy
 * ================================================================
 */

'use strict';

/* ============================================================
   SECTION 1 — Safe Mathematical Expression Evaluator
   Implements: Tokenizer → Shunting-Yard Algorithm → AST-style eval
   No use of eval(), new Function(), or dynamic code execution.
   ============================================================ */

/**
 * Token types used throughout the parsing pipeline.
 * @enum {string}
 */
const TOKEN = {
  NUMBER: 'NUMBER',
  OPERATOR: 'OPERATOR',
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  EOF: 'EOF',
};

/**
 * Operator metadata: precedence, associativity, evaluation function.
 * @type {Record<string, {precedence: number, associativity: 'L'|'R', fn: Function}>}
 */
const OPERATORS = {
  '+': { precedence: 1, associativity: 'L', fn: (a, b) => a + b },
  '-': { precedence: 1, associativity: 'L', fn: (a, b) => a - b },
  '*': { precedence: 2, associativity: 'L', fn: (a, b) => a * b },
  '/': { precedence: 2, associativity: 'L', fn: (a, b) => a / b },
  '^': { precedence: 3, associativity: 'R', fn: (a, b) => Math.pow(a, b) },
};

/**
 * Tokenize a raw expression string into an ordered array of token objects.
 *
 * Rules:
 * - Handles multi-digit and decimal numbers including leading dot (e.g. ".5")
 * - Handles unary minus/plus — a leading '-' or '+' or one following '(' is unary
 * - Strips whitespace
 * - Throws on unknown characters
 *
 * @param {string} expression - The input string to tokenize
 * @returns {Array<{type: string, value: string|number}>}
 */
function tokenize(expression) {
  const tokens = [];
  let i = 0;
  const len = expression.length;

  while (i < len) {
    const ch = expression[i];

    // Skip whitespace
    if (/\s/.test(ch)) { i++; continue; }

    // Number (integer or float)
    if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < len && /[0-9]/.test(expression[i + 1]))) {
      let numStr = '';
      let dotCount = 0;
      while (i < len && (/[0-9]/.test(expression[i]) || expression[i] === '.')) {
        if (expression[i] === '.') {
          dotCount++;
          if (dotCount > 1) throw new Error('Invalid number format: multiple decimal points');
        }
        numStr += expression[i];
        i++;
      }
      tokens.push({ type: TOKEN.NUMBER, value: parseFloat(numStr) });
      continue;
    }

    // Operators
    if (ch in OPERATORS) {
      // Determine if unary: at start, or after '(', or after another operator
      const isUnary = tokens.length === 0 ||
        tokens[tokens.length - 1].type === TOKEN.LPAREN ||
        tokens[tokens.length - 1].type === TOKEN.OPERATOR;

      if (isUnary) {
        if (ch === '-') {
          // Unary minus — push a 0 so we get "0 - x" = -x
          tokens.push({ type: TOKEN.NUMBER, value: 0 });
          tokens.push({ type: TOKEN.OPERATOR, value: '-' });
        } else if (ch === '+') {
          // Unary plus is a no-op; skip it
        } else {
          throw new Error(`Unexpected operator: "${ch}" at position ${i}`);
        }
      } else {
        tokens.push({ type: TOKEN.OPERATOR, value: ch });
      }
      i++;
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: TOKEN.LPAREN, value: '(' });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: TOKEN.RPAREN, value: ')' });
      i++;
      continue;
    }

    // Unknown character
    throw new Error(`Unknown character: "${ch}" at position ${i}`);
  }

  return tokens;
}

/**
 * Convert an infix token array to Reverse Polish Notation (RPN)
 * using the classic Shunting-Yard algorithm by Dijkstra.
 *
 * @param {Array<{type: string, value: string|number}>} tokens
 * @returns {Array<{type: string, value: string|number}>} tokens in RPN order
 */
function shuntingYard(tokens) {
  const output = [];    // The output queue (RPN)
  const opStack = [];   // Operator stack

  for (const token of tokens) {
    if (token.type === TOKEN.NUMBER) {
      output.push(token);
      continue;
    }

    if (token.type === TOKEN.OPERATOR) {
      const op = OPERATORS[token.value];
      while (
        opStack.length > 0 &&
        opStack[opStack.length - 1].type === TOKEN.OPERATOR
      ) {
        const top = opStack[opStack.length - 1];
        const topOp = OPERATORS[top.value];
        if (
          topOp.precedence > op.precedence ||
          (topOp.precedence === op.precedence && op.associativity === 'L')
        ) {
          output.push(opStack.pop());
        } else {
          break;
        }
      }
      opStack.push(token);
      continue;
    }

    if (token.type === TOKEN.LPAREN) {
      opStack.push(token);
      continue;
    }

    if (token.type === TOKEN.RPAREN) {
      let foundLP = false;
      while (opStack.length > 0) {
        const top = opStack.pop();
        if (top.type === TOKEN.LPAREN) {
          foundLP = true;
          break;
        }
        output.push(top);
      }
      if (!foundLP) throw new Error('Mismatched parentheses: extra ")"');
      continue;
    }
  }

  // Drain remaining operators from stack
  while (opStack.length > 0) {
    const top = opStack.pop();
    if (top.type === TOKEN.LPAREN) throw new Error('Mismatched parentheses: unclosed "("');
    output.push(top);
  }

  return output;
}

/**
 * Evaluate an RPN token array by simulating a stack machine.
 *
 * @param {Array<{type: string, value: string|number}>} rpn
 * @returns {number} The final numeric result
 */
function evaluateRPN(rpn) {
  const stack = [];

  for (const token of rpn) {
    if (token.type === TOKEN.NUMBER) {
      stack.push(token.value);
      continue;
    }

    if (token.type === TOKEN.OPERATOR) {
      if (stack.length < 2) throw new Error('Invalid expression: insufficient operands');
      const b = stack.pop();
      const a = stack.pop();
      const op = OPERATORS[token.value];
      if (!op) throw new Error(`Unknown operator: "${token.value}"`);

      // Division by zero guard
      if (token.value === '/' && b === 0) throw new Error('DIVISION_BY_ZERO');

      const result = op.fn(a, b);
      if (!isFinite(result)) throw new Error('DIVISION_BY_ZERO');
      stack.push(result);
      continue;
    }
  }

  if (stack.length !== 1) throw new Error('Invalid expression: too many values');
  return stack[0];
}

/**
 * High-level safe evaluate function.
 * Runs the full pipeline: tokenize → shuntingYard → evaluateRPN.
 *
 * @param {string} expression - The expression string to evaluate (e.g. "3+4*(2-1)")
 * @returns {{ value: number|null, error: string|null }}
 */
function safeEvaluate(expression) {
  try {
    if (!expression || expression.trim() === '') return { value: null, error: null };

    const tokens = tokenize(expression.trim());
    if (tokens.length === 0) return { value: null, error: null };

    const rpn = shuntingYard(tokens);
    const result = evaluateRPN(rpn);
    return { value: result, error: null };
  } catch (err) {
    return { value: null, error: err.message || 'Invalid expression' };
  }
}

/**
 * Format a number for display — avoiding floating-point artifacts.
 * Uses toPrecision(12) to strip noisy trailing digits, then cleans up.
 *
 * @param {number} num
 * @param {number} [maxDigits=12]
 * @returns {string}
 */
function formatNumber(num, maxDigits = 12) {
  if (!isFinite(num)) return 'Error';
  if (Object.is(num, -0)) return '0';

  // Handle very large or very small numbers with exponential notation
  if (Math.abs(num) > 1e14 || (Math.abs(num) < 1e-7 && num !== 0)) {
    return parseFloat(num.toPrecision(10)).toExponential();
  }

  // Strip floating-point noise by rounding to 12 significant figures
  const precise = parseFloat(num.toPrecision(12));
  const str = precise.toString();

  // If result is an integer-looking number, strip the unnecessary .0
  if (str.includes('.')) {
    return parseFloat(str).toString();
  }
  return str;
}

/* ============================================================
   SECTION 2 — Calculator State & Configuration
   ============================================================ */

/**
 * Global calculator application state.
 * All mutations go through the update functions below.
 */
const state = {
  expression: '',           // Current infix expression (what user has typed)
  displayValue: '0',        // The value shown in the main display
  justCalculated: false,     // True after user pressed "=" — affects next input behavior
  lastAnswer: null,         // Last successfully computed result (for Ans button)
  history: [],              // Array of { expression, result, timestamp } objects
  theme: 'dark',            // 'dark' | 'light'
  soundEnabled: false,      // Whether click sounds are enabled
  historyOpen: false,       // Whether history panel is open
};

/** Maximum number of history items to retain in memory / localStorage */
const HISTORY_MAX = 50;

/** localStorage keys */
const LS_KEYS = {
  THEME: 'nexus_theme',
  HISTORY: 'nexus_history',
  SOUND: 'nexus_sound',
};

/* ============================================================
   SECTION 3 — DOM Element References
   ============================================================ */

const DOM = {
  primaryDisplay: document.getElementById('primaryDisplay'),
  expressionDisplay: document.getElementById('expressionDisplay'),
  previewDisplay: document.getElementById('previewDisplay'),
  previewValue: document.getElementById('previewValue'),
  statusDot: document.querySelector('.status-dot'),
  statusLabel: document.getElementById('statusLabel'),
  historyPanel: document.getElementById('historyPanel'),
  historyBody: document.getElementById('historyBody'),
  historyList: document.getElementById('historyList'),
  historyEmpty: document.getElementById('historyEmpty'),
  historyBadge: document.getElementById('historyBadge'),
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  historyToggleBtn: document.getElementById('historyToggleBtn'),
  soundToggleBtn: document.getElementById('soundToggleBtn'),
  shortcutsBtn: document.getElementById('shortcutsBtn'),
  clearHistoryBtn: document.getElementById('clearHistoryBtn'),
  closeHistoryBtn: document.getElementById('closeHistoryBtn'),
  copyResultBtn: document.getElementById('copyResultBtn'),
  shortcutsModal: document.getElementById('shortcutsModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  modalOkBtn: document.getElementById('modalOkBtn'),
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  toastContainer: document.getElementById('toastContainer'),
  ansBtn: document.getElementById('ansBtn'),
};

/* ============================================================
   SECTION 4 — Web Audio API (Sound Effects)
   ============================================================ */

let audioCtx = null;

/**
 * Lazily initialize the AudioContext on the first user interaction.
 * @returns {AudioContext|null}
 */
function getAudioCtx() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Play a short synthesized click tone.
 * @param {'num'|'op'|'eq'|'clear'|'del'} type - The key type for different tones.
 */
function playSound(type) {
  if (!state.soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const sounds = {
    num:   { freq: 880, type: 'sine',    dur: 0.045, vol: 0.08 },
    op:    { freq: 660, type: 'triangle', dur: 0.055, vol: 0.09 },
    eq:    { freq: 1046, type: 'sine',   dur: 0.1,   vol: 0.1  },
    clear: { freq: 330,  type: 'square', dur: 0.07,  vol: 0.07 },
    del:   { freq: 500,  type: 'triangle', dur: 0.05, vol: 0.07 },
  };

  const s = sounds[type] || sounds.num;
  osc.type = s.type;
  osc.frequency.setValueAtTime(s.freq, ctx.currentTime);
  gain.gain.setValueAtTime(s.vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + s.dur);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + s.dur + 0.01);
}

/* ============================================================
   SECTION 5 — Display Rendering
   ============================================================ */

/**
 * Update the main (primary) display text, and auto-scale font size.
 * @param {string} text - Text to display
 * @param {boolean} [isError=false] - Whether the value is an error state
 */
function setMainDisplay(text, isError = false) {
  const el = DOM.primaryDisplay;
  el.textContent = text;

  // Remove all font size classes
  el.classList.remove('font-md', 'font-sm', 'font-xs', 'error-state');

  if (isError) {
    el.classList.add('error-state');
  } else {
    const len = text.length;
    if (len > 18) el.classList.add('font-xs');
    else if (len > 12) el.classList.add('font-sm');
    else if (len > 8) el.classList.add('font-md');
  }
}

/**
 * Render the expression display with operator color highlights.
 * @param {string} expr - The raw expression string
 */
function setExpressionDisplay(expr) {
  if (!expr) {
    DOM.expressionDisplay.textContent = '';
    return;
  }
  // Highlight operators with a styled span
  const highlighted = expr.replace(/([+\-*/^%()])/g, (match) => {
    return `<span class="op-token">${escapeHtml(match)}</span>`;
  });
  DOM.expressionDisplay.innerHTML = highlighted;
  // Auto-scroll expression display to the right so current input is visible
  DOM.expressionDisplay.scrollLeft = DOM.expressionDisplay.scrollWidth;
}

/**
 * Update the live preview display (shown while user types).
 * @param {string|null} previewVal - The formatted preview result, or null to hide.
 */
function setPreviewDisplay(previewVal) {
  if (previewVal === null || previewVal === '' || previewVal === DOM.primaryDisplay.textContent) {
    DOM.previewDisplay.classList.remove('visible');
    DOM.previewValue.textContent = '';
  } else {
    DOM.previewValue.textContent = previewVal;
    DOM.previewDisplay.classList.add('visible');
  }
}

/**
 * Update the status indicator dot and label.
 * @param {'ready'|'active'|'error'} status
 */
function setStatus(status) {
  const dot = DOM.statusDot;
  dot.classList.remove('active', 'error');
  if (status === 'active') dot.classList.add('active');
  if (status === 'error') dot.classList.add('error');

  const labels = { ready: 'READY', active: 'INPUT', error: 'ERROR' };
  DOM.statusLabel.textContent = labels[status] || 'READY';
}

/**
 * Escape HTML special characters for safe innerHTML insertion.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Full render cycle: sync all display areas with current state.
 */
function render() {
  const expr = state.expression;

  if (state.justCalculated) {
    // Post-equals state: show result in main, expression in secondary
    setMainDisplay(state.displayValue);
    setExpressionDisplay(expr + ' =');
    setPreviewDisplay(null);
    setStatus('ready');
  } else if (expr === '' || expr === '-') {
    setMainDisplay(state.displayValue);
    setExpressionDisplay('');
    setPreviewDisplay(null);
    setStatus('ready');
  } else {
    // Live entry mode
    setExpressionDisplay(expr);

    // Try to compute a live preview if expression ends with a number
    const { value: liveVal, error } = safeEvaluate(expr);

    if (error === 'DIVISION_BY_ZERO') {
      setMainDisplay(getLastTokenDisplay(expr));
      setPreviewDisplay('÷ 0 = Error');
      setStatus('error');
    } else if (liveVal !== null) {
      const formatted = formatNumber(liveVal);
      setMainDisplay(getLastTokenDisplay(expr));
      setPreviewDisplay(formatted);
      setStatus('active');
    } else {
      setMainDisplay(getLastTokenDisplay(expr));
      setPreviewDisplay(null);
      setStatus('active');
    }
  }
}

/**
 * Extract the rightmost "current token" from the expression to show in main display.
 * This keeps the display showing the number being typed, not the whole expression.
 * @param {string} expr
 * @returns {string}
 */
function getLastTokenDisplay(expr) {
  if (!expr) return '0';
  // Match last number (possibly with leading '-' and decimal)
  const match = expr.match(/(-?\d*\.?\d*)$/);
  if (match && match[1] !== '' && match[1] !== '-') {
    return match[1];
  }
  // If ends with operator, show 0
  return '0';
}

/* ============================================================
   SECTION 6 — Calculator Operations
   ============================================================ */

/**
 * Append a digit or decimal point to the current expression.
 * @param {string} digit - '0'-'9' or '.'
 */
function inputDigit(digit) {
  if (state.justCalculated) {
    // If user starts typing a new number after =, start fresh
    state.expression = '';
    state.displayValue = '0';
    state.justCalculated = false;
  }

  if (digit === '.') {
    // Find the last token to check if it already has a decimal
    const lastNum = state.expression.match(/(\d*\.?\d*)$/)?.[1] ?? '';
    if (lastNum.includes('.')) return; // Already has a decimal in current number
    if (lastNum === '' || isOperatorChar(state.expression.slice(-1))) {
      state.expression += '0'; // Prepend 0 for naked decimal: "." → "0."
    }
  }

  state.expression += digit;
  render();
  playSound('num');
}

/**
 * Append an arithmetic operator to the expression.
 * Handles chained ops (replace last operator if expression ends with one).
 * @param {string} op - '+' | '-' | '*' | '/' | '^'
 */
function inputOperator(op) {
  if (state.expression === '' && op === '-') {
    // Allow starting with unary minus
    state.expression = '-';
    state.justCalculated = false;
    render();
    playSound('op');
    return;
  }

  if (state.expression === '') return;

  // If just calculated, allow continuing the chain from the result
  if (state.justCalculated) {
    state.expression = state.displayValue;
    state.justCalculated = false;
  }

  const last = state.expression.slice(-1);

  if (isOperatorChar(last) && last !== ')') {
    if (op === '-' && last !== '-') {
      // Allow "-" after an operator (for negative operand)
      state.expression += op;
    } else {
      // Replace trailing operator
      state.expression = state.expression.slice(0, -1) + op;
    }
  } else if (last === '-' && state.expression.length >= 2 && isOperatorChar(state.expression.slice(-2, -1))) {
    // Replace double operator (e.g., "+-" → "+")
    state.expression = state.expression.slice(0, -2) + op;
  } else {
    state.expression += op;
  }

  render();
  playSound('op');
}

/**
 * Handle the percentage (%) action.
 * Converts the current trailing number to its percentage form (÷ 100).
 */
function inputPercent() {
  if (state.expression === '') return;

  if (state.justCalculated) {
    // Apply percent to the already-calculated result
    const val = parseFloat(state.displayValue);
    if (!isNaN(val)) {
      const result = val / 100;
      state.expression = formatNumber(result);
      state.displayValue = formatNumber(result);
      state.justCalculated = false;
      render();
    }
    return;
  }

  // Identify the last number in the expression and divide it by 100
  const match = state.expression.match(/^(.*?)(-?\d+\.?\d*)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const num = parseFloat(numStr);
    if (!isNaN(num)) {
      const percentVal = num / 100;
      state.expression = prefix + formatNumber(percentVal);
      render();
      playSound('num');
    }
  }
}

/**
 * Insert a raw string into the expression (for parentheses, Ans, etc.).
 * @param {string} str - String to insert
 */
function insertRaw(str) {
  if (state.justCalculated) {
    if (str === '(') {
      // Start a fresh expression with opening paren
      state.expression = str;
      state.justCalculated = false;
    } else if (str === ')') {
      // Apply ) to current result expression
      state.expression = `(${state.displayValue})`;
      state.justCalculated = false;
    } else {
      state.expression = state.displayValue + str;
      state.justCalculated = false;
    }
    render();
    return;
  }
  state.expression += str;
  render();
  playSound('num');
}

/**
 * Delete the last character from the expression (Backspace / DEL).
 */
function deleteLast() {
  if (state.justCalculated) {
    // On post-equals, DEL clears everything
    clearAll();
    return;
  }

  if (state.expression.length > 0) {
    state.expression = state.expression.slice(0, -1);
    if (state.expression === '' || state.expression === '-') {
      state.displayValue = '0';
    }
    render();
    playSound('del');
  }
}

/**
 * Toggle the sign of the current number (negate it).
 * If expression ends with a number, wraps it in negation.
 */
function toggleSign() {
  if (state.justCalculated) {
    const val = parseFloat(state.displayValue);
    if (!isNaN(val) && val !== 0) {
      const negated = formatNumber(-val);
      state.displayValue = negated;
      state.expression = negated;
      state.justCalculated = false;
      render();
    }
    return;
  }

  if (state.expression === '') return;

  // Check if the entire expression is a number
  const numOnly = /^-?\d*\.?\d+$/.test(state.expression);
  if (numOnly) {
    const val = parseFloat(state.expression);
    state.expression = formatNumber(-val);
    render();
    return;
  }

  // Find the last number and negate it
  const match = state.expression.match(/^(.*?)(-?\d+\.?\d*)$/);
  if (match) {
    const prefix = match[1];
    const numStr = match[2];
    const negated = formatNumber(-parseFloat(numStr));
    state.expression = prefix + negated;
    render();
  }
}

/**
 * Clear everything and reset to initial state (AC button / Escape).
 */
function clearAll() {
  state.expression = '';
  state.displayValue = '0';
  state.justCalculated = false;

  setMainDisplay('0');
  setExpressionDisplay('');
  setPreviewDisplay(null);
  setStatus('ready');

  playSound('clear');

  // Brief visual flash on the display
  DOM.primaryDisplay.style.opacity = '0.5';
  setTimeout(() => { DOM.primaryDisplay.style.opacity = '1'; }, 100);
}

/**
 * Calculate the final result of the current expression.
 * Updates state, history, and display accordingly.
 */
function calculate() {
  if (state.expression === '' || state.expression === '-') return;

  const rawExpr = state.expression;
  const { value, error } = safeEvaluate(rawExpr);

  if (error === 'DIVISION_BY_ZERO') {
    setStatus('error');
    setMainDisplay('Cannot divide by 0', true);
    DOM.expressionDisplay.textContent = rawExpr + ' =';
    setPreviewDisplay(null);
    playSound('clear');
    state.justCalculated = true;
    state.displayValue = 'Error';
    state.expression = rawExpr;
    return;
  }

  if (error || value === null) {
    setStatus('error');
    setMainDisplay('Invalid Expression', true);
    setPreviewDisplay(null);
    playSound('clear');
    state.justCalculated = true;
    state.displayValue = 'Error';
    return;
  }

  const formatted = formatNumber(value);
  state.displayValue = formatted;
  state.lastAnswer = value;
  state.justCalculated = true;

  // Add to history
  addHistoryEntry(rawExpr, formatted);

  render();
  playSound('eq');
}

/** @param {string} ch @returns {boolean} */
function isOperatorChar(ch) {
  return ch !== undefined && '+-*/^'.includes(ch);
}

/* ============================================================
   SECTION 7 — Calculation History
   ============================================================ */

/**
 * Add a new calculation to history state and persist to localStorage.
 * @param {string} expression - The input expression
 * @param {string} result - The formatted result string
 */
function addHistoryEntry(expression, result) {
  const entry = {
    expression,
    result,
    timestamp: Date.now(),
  };

  state.history.unshift(entry); // Newest first
  if (state.history.length > HISTORY_MAX) state.history.pop();

  persistHistory();
  renderHistory();
  updateHistoryBadge();
}

/**
 * Render the history list panel from current state.
 */
function renderHistory() {
  const list = DOM.historyList;
  const empty = DOM.historyEmpty;

  if (state.history.length === 0) {
    list.classList.add('hidden');
    empty.style.display = '';
    return;
  }

  empty.style.display = 'none';
  list.classList.remove('hidden');

  list.innerHTML = '';
  state.history.forEach((entry, index) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.setAttribute('role', 'listitem');
    li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', `${entry.expression} = ${entry.result}. Click to reuse.`);
    li.dataset.index = index;

    const time = new Date(entry.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    li.innerHTML = `
      <div class="history-item-header">
        <span class="history-item-time">${escapeHtml(time)}</span>
        <div class="history-item-actions">
          <button class="item-action-btn" data-copy="${escapeHtml(entry.result)}" aria-label="Copy result ${escapeHtml(entry.result)}" title="Copy result">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
          <button class="item-action-btn" data-delete="${index}" aria-label="Delete this history entry" title="Delete entry">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="history-item-expr">${escapeHtml(entry.expression)}</div>
      <div class="history-item-res">${escapeHtml(entry.result)}</div>
    `;

    // Click to reuse result
    li.addEventListener('click', (e) => {
      // Handle copy button click inside item
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        e.stopPropagation();
        copyToClipboard(copyBtn.dataset.copy);
        return;
      }

      // Handle delete button click inside item
      const deleteBtn = e.target.closest('[data-delete]');
      if (deleteBtn) {
        e.stopPropagation();
        deleteHistoryEntry(parseInt(deleteBtn.dataset.delete, 10));
        return;
      }

      // Reuse result
      reuseHistoryResult(entry.result);
    });

    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        reuseHistoryResult(entry.result);
      }
    });

    list.appendChild(li);
  });
}

/**
 * Load a history result into the calculator as the current input.
 * @param {string} result - The result string to load
 */
function reuseHistoryResult(result) {
  if (result === 'Error') return;
  state.expression = result;
  state.displayValue = result;
  state.justCalculated = false;
  render();
  showToast('Result loaded', '✓');

  // On mobile, close the history panel after selecting
  if (window.innerWidth < 900) {
    setHistoryPanelOpen(false);
  }
}

/**
 * Delete a single history entry by index.
 * @param {number} index
 */
function deleteHistoryEntry(index) {
  state.history.splice(index, 1);
  persistHistory();
  renderHistory();
  updateHistoryBadge();
}

/**
 * Clear all history entries.
 */
function clearHistory() {
  state.history = [];
  persistHistory();
  renderHistory();
  updateHistoryBadge();
  showToast('History cleared', '🗑');
}

/**
 * Update the numeric badge on the history button.
 */
function updateHistoryBadge() {
  const count = state.history.length;
  if (count === 0) {
    DOM.historyBadge.classList.add('hidden');
  } else {
    DOM.historyBadge.classList.remove('hidden');
    DOM.historyBadge.textContent = count > 99 ? '99+' : count;
    DOM.historyBadge.setAttribute('aria-label', `${count} calculation${count !== 1 ? 's' : ''} in history`);
  }
}

/** Persist history to localStorage */
function persistHistory() {
  try {
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(state.history));
  } catch { /* Storage may be unavailable — ignore silently */ }
}

/** Load history from localStorage */
function loadHistory() {
  try {
    const stored = localStorage.getItem(LS_KEYS.HISTORY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        state.history = parsed.slice(0, HISTORY_MAX);
      }
    }
  } catch { /* Ignore parse errors */ }
}

/* ============================================================
   SECTION 8 — Theme Management
   ============================================================ */

/**
 * Apply a theme and persist to localStorage.
 * @param {'dark'|'light'} theme
 */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  const sunIcon = DOM.themeToggleBtn.querySelector('.icon-sun');
  const moonIcon = DOM.themeToggleBtn.querySelector('.icon-moon');

  if (theme === 'light') {
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
    DOM.themeToggleBtn.setAttribute('aria-label', 'Switch to dark theme');
    DOM.themeToggleBtn.setAttribute('title', 'Switch to Dark Theme (T)');
  } else {
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
    DOM.themeToggleBtn.setAttribute('aria-label', 'Switch to light theme');
    DOM.themeToggleBtn.setAttribute('title', 'Switch to Light Theme (T)');
  }

  try {
    localStorage.setItem(LS_KEYS.THEME, theme);
  } catch { /* ignore */ }
}

/** Toggle between dark and light theme */
function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

/** Load saved theme preference from localStorage */
function loadTheme() {
  try {
    const saved = localStorage.getItem(LS_KEYS.THEME);
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }
  } catch { /* ignore */ }

  // Respect system preference as default
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

/* ============================================================
   SECTION 9 — History Panel Toggle
   ============================================================ */

/**
 * Open or close the history panel.
 * @param {boolean} open
 */
function setHistoryPanelOpen(open) {
  state.historyOpen = open;
  const panel = DOM.historyPanel;
  const backdrop = DOM.drawerBackdrop;
  const isMobile = window.innerWidth < 900;

  if (open) {
    panel.setAttribute('aria-hidden', 'false');
    // Only show the dark backdrop overlay on mobile (drawer mode)
    if (isMobile) {
      backdrop.classList.remove('hidden');
    } else {
      backdrop.classList.add('hidden');
    }
    DOM.historyToggleBtn.setAttribute('aria-expanded', 'true');
    renderHistory();
    // Focus first item if present, else the close button
    setTimeout(() => {
      const firstItem = panel.querySelector('.history-item, #closeHistoryBtn');
      firstItem?.focus();
    }, 100);
  } else {
    panel.setAttribute('aria-hidden', 'true');
    backdrop.classList.add('hidden');
    DOM.historyToggleBtn.setAttribute('aria-expanded', 'false');
    DOM.historyToggleBtn.focus();
  }
}

function toggleHistoryPanel() {
  setHistoryPanelOpen(!state.historyOpen);
}

/* ============================================================
   SECTION 10 — Sound Toggle
   ============================================================ */

function applySoundState() {
  const offIcon = DOM.soundToggleBtn.querySelector('.icon-sound-off');
  const onIcon = DOM.soundToggleBtn.querySelector('.icon-sound-on');

  if (state.soundEnabled) {
    offIcon.classList.add('hidden');
    onIcon.classList.remove('hidden');
    DOM.soundToggleBtn.setAttribute('title', 'Sound: On (Press M to toggle)');
    DOM.soundToggleBtn.setAttribute('aria-label', 'Disable Sound Effects');
  } else {
    offIcon.classList.remove('hidden');
    onIcon.classList.add('hidden');
    DOM.soundToggleBtn.setAttribute('title', 'Sound: Off (Press M to toggle)');
    DOM.soundToggleBtn.setAttribute('aria-label', 'Enable Sound Effects');
  }
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  applySoundState();
  try { localStorage.setItem(LS_KEYS.SOUND, state.soundEnabled ? '1' : '0'); } catch { /* ignore */ }
  if (state.soundEnabled) {
    // Resume AudioContext if suspended (browser policy)
    getAudioCtx()?.resume();
    showToast('Sound On', '🔊');
    setTimeout(() => playSound('eq'), 50);
  } else {
    showToast('Sound Off', '🔇');
  }
}

function loadSoundPref() {
  try {
    const saved = localStorage.getItem(LS_KEYS.SOUND);
    if (saved === '1') {
      state.soundEnabled = true;
      applySoundState();
    }
  } catch { /* ignore */ }
}

/* ============================================================
   SECTION 11 — Shortcuts Modal
   ============================================================ */

function openShortcutsModal() {
  DOM.shortcutsModal.classList.remove('hidden');
  DOM.closeModalBtn.focus();
  document.body.style.overflow = 'hidden';
}

function closeShortcutsModal() {
  DOM.shortcutsModal.classList.add('hidden');
  document.body.style.overflow = '';
  DOM.shortcutsBtn.focus();
}

/* ============================================================
   SECTION 12 — Clipboard Copy
   ============================================================ */

/**
 * Copy text to clipboard and show toast feedback.
 * @param {string} text
 */
async function copyToClipboard(text) {
  if (!text || text === 'Error') return;
  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', '✓');
  } catch {
    // Fallback for environments without Clipboard API
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied!', '✓');
    } catch {
      showToast('Copy failed', '✗');
    }
  }
}

/* ============================================================
   SECTION 13 — Toast Notifications
   ============================================================ */

/**
 * Show a brief toast notification.
 * @param {string} message
 * @param {string} [icon='']
 * @param {number} [duration=1800]
 */
function showToast(message, icon = '', duration = 1800) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `${icon ? `<span aria-hidden="true">${escapeHtml(icon)}</span>` : ''}<span>${escapeHtml(message)}</span>`;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-fadeout');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ============================================================
   SECTION 14 — Ripple Effect on Button Click
   ============================================================ */

/**
 * Create and append a ripple element to a button on click.
 * @param {HTMLElement} btn - The button element
 * @param {MouseEvent} event - The click event
 */
function triggerRipple(btn, event) {
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
}

/* ============================================================
   SECTION 15 — Keyboard Flash Animation on Buttons
   ============================================================ */

/**
 * Briefly flash a button's active state to reflect keyboard input visually.
 * @param {HTMLElement} btn
 */
function flashButton(btn) {
  if (!btn) return;
  btn.classList.add('keyboard-active');
  setTimeout(() => btn.classList.remove('keyboard-active'), 120);
}

/* ============================================================
   SECTION 16 — Event Handler: Button Click Dispatch
   ============================================================ */

/**
 * Handle a calculator key button click event.
 * Dispatches to appropriate calculator operation based on data attributes.
 * @param {HTMLElement} btn - The clicked button
 * @param {MouseEvent|null} event - Original click event (optional for ripple)
 */
function handleKeyClick(btn, event = null) {
  if (event) triggerRipple(btn, event);

  const action = btn.dataset.action;
  const number = btn.dataset.number;
  const operator = btn.dataset.operator;
  const insert = btn.dataset.insert;

  if (number !== undefined) {
    inputDigit(number);
  } else if (insert !== undefined) {
    insertRaw(insert);
  } else if (operator !== undefined) {
    inputOperator(operator);
  } else if (action) {
    switch (action) {
      case 'clear':     clearAll();      break;
      case 'delete':    deleteLast();    break;
      case 'percent':   inputPercent();  break;
      case 'decimal':   inputDigit('.');  break;
      case 'calculate': calculate();     break;
      case 'negate':    toggleSign();    break;
    }
  }
}

/* ============================================================
   SECTION 17 — Keyboard Input Handler
   ============================================================ */

/**
 * Map keyboard key events to calculator actions.
 * Handles shortcuts for theme, history, sound, modal, etc.
 * @param {KeyboardEvent} e
 */
function handleKeyDown(e) {
  // If modal is open, only allow closing
  if (!DOM.shortcutsModal.classList.contains('hidden')) {
    if (e.key === 'Escape' || e.key === 'Enter') closeShortcutsModal();
    return;
  }

  // Ignore if modifier keys are held (allow Ctrl+C, Ctrl+V, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;
  let handled = true;
  let targetBtnSelector = null;

  switch (true) {
    // --- Digits ---
    case /^[0-9]$/.test(key):
      inputDigit(key);
      targetBtnSelector = `[data-number="${key}"]`;
      break;

    // --- Decimal ---
    case key === '.':
      inputDigit('.');
      targetBtnSelector = `[data-action="decimal"]`;
      break;

    // --- Operators ---
    case key === '+':
      inputOperator('+');
      targetBtnSelector = `[data-operator="+"]`;
      break;

    case key === '-':
      inputOperator('-');
      targetBtnSelector = `[data-operator="-"]`;
      break;

    case key === '*':
      inputOperator('*');
      targetBtnSelector = `[data-operator="*"]`;
      break;

    case key === '/':
      e.preventDefault(); // Prevent browser's find bar on some browsers
      inputOperator('/');
      targetBtnSelector = `[data-operator="/"]`;
      break;

    case key === '^':
      inputOperator('^');
      targetBtnSelector = `[data-operator="^"]`;
      break;

    // --- Percent ---
    case key === '%':
      inputPercent();
      targetBtnSelector = `[data-action="percent"]`;
      break;

    // --- Parentheses ---
    case key === '(':
      insertRaw('(');
      targetBtnSelector = `[data-insert="("]`;
      break;

    case key === ')':
      insertRaw(')');
      targetBtnSelector = `[data-insert=")"]`;
      break;

    // --- Enter / = → Calculate ---
    case key === 'Enter' || key === '=':
      e.preventDefault();
      calculate();
      targetBtnSelector = `[data-action="calculate"]`;
      break;

    // --- Backspace → Delete ---
    case key === 'Backspace':
      e.preventDefault();
      deleteLast();
      targetBtnSelector = `[data-action="delete"]`;
      break;

    // --- Escape / c → Clear All ---
    case key === 'Escape':
    case key === 'c':
      clearAll();
      targetBtnSelector = `[data-action="clear"]`;
      break;

    // --- F9 / ± (negate) ---
    case key === 'F9':
      toggleSign();
      targetBtnSelector = `[data-action="negate"]`;
      break;

    // --- App Shortcuts ---
    case key === 'h':
      toggleHistoryPanel();
      break;

    case key === 't':
      toggleTheme();
      break;

    case key === 'm':
      toggleSound();
      break;

    case key === '?':
      openShortcutsModal();
      break;

    default:
      handled = false;
  }

  if (handled && targetBtnSelector) {
    const btn = document.querySelector(targetBtnSelector);
    if (btn) flashButton(btn);
  }
}

/* ============================================================
   SECTION 18 — Event Listeners Setup
   ============================================================ */

function setupEventListeners() {
  // --- Calculator Keypad (event delegation) ---
  const calcCard = document.querySelector('.calculator-card');
  calcCard.addEventListener('click', (e) => {
    const btn = e.target.closest('.key');
    if (btn) handleKeyClick(btn, e);
  });

  // --- Auxiliary Keypad (event delegation) ---
  const auxKeypad = document.querySelector('.aux-keypad');
  auxKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('.key-aux');
    if (btn) handleKeyClick(btn, e);
  });

  // --- Ans Button ---
  DOM.ansBtn.addEventListener('click', () => {
    if (state.lastAnswer !== null) {
      const ansStr = formatNumber(state.lastAnswer);
      if (state.justCalculated) {
        state.expression = ansStr;
        state.displayValue = ansStr;
        state.justCalculated = false;
      } else {
        state.expression += ansStr;
      }
      render();
      playSound('num');
    } else {
      showToast('No previous answer', 'ℹ');
    }
  });

  // --- Keyboard ---
  document.addEventListener('keydown', handleKeyDown);

  // --- Header Buttons ---
  DOM.themeToggleBtn.addEventListener('click', toggleTheme);
  DOM.historyToggleBtn.addEventListener('click', toggleHistoryPanel);
  DOM.soundToggleBtn.addEventListener('click', toggleSound);
  DOM.shortcutsBtn.addEventListener('click', openShortcutsModal);

  // --- History Panel Controls ---
  DOM.clearHistoryBtn.addEventListener('click', clearHistory);
  DOM.closeHistoryBtn.addEventListener('click', () => setHistoryPanelOpen(false));
  DOM.drawerBackdrop.addEventListener('click', () => setHistoryPanelOpen(false));

  // --- Copy Result Button ---
  DOM.copyResultBtn.addEventListener('click', () => {
    const val = DOM.primaryDisplay.textContent;
    if (val && val !== '0' && !val.includes('Error')) {
      copyToClipboard(val);
    }
  });

  // --- Shortcuts Modal ---
  DOM.closeModalBtn.addEventListener('click', closeShortcutsModal);
  DOM.modalOkBtn.addEventListener('click', closeShortcutsModal);
  DOM.shortcutsModal.addEventListener('click', (e) => {
    if (e.target === DOM.shortcutsModal) closeShortcutsModal();
  });

  // --- Escape key closes history panel too ---
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.historyOpen) {
      setHistoryPanelOpen(false);
    }
  }, true); // Capture phase so it fires before our main handler

  // --- System color scheme change listener ---
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    const savedTheme = localStorage.getItem(LS_KEYS.THEME);
    if (!savedTheme) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/* ============================================================
   SECTION 19 — Initialization
   ============================================================ */

/**
 * Bootstrap the NEXUS Calculator application.
 */
function init() {
  // Load persisted preferences
  loadTheme();
  loadHistory();
  loadSoundPref();

  // Render initial UI
  renderHistory();
  updateHistoryBadge();

  // Wire up all event listeners
  setupEventListeners();

  // Initial display state
  setMainDisplay('0');
  setStatus('ready');

  // Set initial aria-expanded on history button
  DOM.historyToggleBtn.setAttribute('aria-expanded', 'false');
  DOM.historyPanel.setAttribute('aria-hidden', 'true');

  // On desktop (≥900px), auto-open history if there are items
  if (window.innerWidth >= 900 && state.history.length > 0) {
    setHistoryPanelOpen(true);
  }

  console.log(
    '%c NEXUS Smart Calculator ',
    'background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; font-size: 14px; font-weight: bold; padding: 4px 10px; border-radius: 6px;',
    '\nReady. No eval() used. Safe AST-based parser active.'
  );
}

// Kick off the app when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
