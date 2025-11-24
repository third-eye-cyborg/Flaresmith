/*
 * ESLint Plugin: design-tokens
 * Tasks: T090, T091, T092
 * Provides rules enforcing token usage and naming governance.
 */

import fs from 'node:fs';
import path from 'node:path';

// Load token mapping once (value -> token name)
let tokenValueMap = null;
let colorIndex = [];
function hexToRgb(hex) {
  const h = hex.replace('#','');
  const bigint = parseInt(h.length === 3 ? h.split('').map(c=>c+c).join('') : h.substring(0,6),16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r,g,b];
}
function colorDistance(a,b){
  const [ar,ag,ab] = hexToRgb(a);
  const [br,bg,bb] = hexToRgb(b);
  return Math.sqrt((ar-br)**2 + (ag-bg)**2 + (ab-bb)**2);
}
function loadTokenMap() {
  if (tokenValueMap) return tokenValueMap;
  tokenValueMap = new Map();
  colorIndex = [];
  try {
    const generatedPath = path.resolve(process.cwd(), 'packages/config/tailwind/tokens.generated.ts');
    const baseJsonPath = path.resolve(process.cwd(), 'packages/config/tailwind/tokens.base.json');
    let content = '';
    if (fs.existsSync(generatedPath)) {
      content = fs.readFileSync(generatedPath, 'utf-8');
    } else if (fs.existsSync(baseJsonPath)) {
      content = fs.readFileSync(baseJsonPath, 'utf-8');
    }
    if (content) {
      // Capture tokenName and value (hex or color function)
      const regex = /(primary|accent|semantic|glass|elevation|spacing|radius|typography)\.[a-z0-9_.-]+['"\s]*:[\s]*['\"]([^'\"]+)['\"]/g;
      let match;
      while ((match = regex.exec(content))) {
        const categoryName = match[1];
        const value = match[2];
        if (!tokenValueMap.has(value)) tokenValueMap.set(value, categoryName);
        if (/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(value)) {
          colorIndex.push({ value, token: categoryName });
        }
      }
    }
  } catch (e) {
    // degrade gracefully
  }
  return tokenValueMap;
}

const NAMING_REGEX = /^(primary|accent|semantic|glass|elevation|spacing|radius|typography)\.[a-z0-9-]+\.[0-9]{2,3}$/;
const SEMANTIC_EXCEPTIONS = /^(semantic)\.(error|warning|success|info)$/;

function isStyleLiteral(value) {
  return (
    typeof value === 'string' && (
      /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value) || // hex
      /^(oklch|hsl)\(/.test(value) || // color functions
      /^(\d+)(px|rem|em)$/.test(value) // spacing/typography units
    )
  );
}

// Utility to derive suggested token name
function nearestColorToken(value){
  if (!/^#/.test(value)) return null;
  let best = null; let bestDist = Infinity;
  for (const c of colorIndex){
    const dist = colorDistance(value,c.value);
    if (dist < bestDist){ bestDist = dist; best = c; }
  }
  return bestDist < 60 ? best : null; // heuristic threshold
}
function suggestToken(value) {
  const map = loadTokenMap();
  const direct = map.get(value);
  if (direct) return direct;
  const near = nearestColorToken(value);
  if (near) return near.token + ' /* approximate */';
  if (/^(\d+)(px|rem|em)$/.test(value)) return 'spacing.scale /* derive */';
  return '/* manual-token-mapping */';
}

// Rule: no-inline-styles
const noInlineStylesRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hard-coded inline style literals; enforce token usage',
    },
    hasSuggestions: true,
    messages: {
      inlineStyle: 'Inline style literal "{{value}}" detected. Use a design token instead.',
      replaceWithToken: 'Replace inline literal with token reference',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name && node.name.name === 'style' && node.value && node.value.expression && node.value.expression.type === 'ObjectExpression') {
          for (const prop of node.value.expression.properties) {
            if (prop.type !== 'Property') continue;
            const valNode = prop.value;
            if (valNode.type === 'Literal' && isStyleLiteral(valNode.value)) {
              const original = valNode.value;
              const suggestion = suggestToken(original);
              context.report({
                node: valNode,
                messageId: 'inlineStyle',
                data: { value: original },
                suggest: [
                  {
                    messageId: 'replaceWithToken',
                    fix(fixer) {
                      // Provide CSS variable placeholder for migration flow
                      const replacement = `var(--${suggestion.replace(/\s+.*$/, '')}) /* ${original} */`;
                      return fixer.replaceText(valNode, `'${replacement}'`);
                    },
                  },
                ],
              });
            }
          }
        }
      },
      // Object style literals in JS/TS code (e.g., const styles = { color: '#fff' })
      ObjectExpression(node) {
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;
          const valNode = prop.value;
          if (valNode.type === 'Literal' && isStyleLiteral(valNode.value)) {
            const original = valNode.value;
            const suggestion = suggestToken(original);
            context.report({
              node: valNode,
              messageId: 'inlineStyle',
              data: { value: original },
              suggest: [
                  {
                    messageId: 'replaceWithToken',
                    fix(fixer) {
                      const replacement = `var(--${suggestion.replace(/\s+.*$/, '')}) /* ${original} */`;
                      return fixer.replaceText(valNode, `'${replacement}'`);
                    },
                  },
                ],
            });
          }
        }
      },
    };
  },
};

// Rule: no-reserved-namespaces (validate token naming pattern for newly introduced literals)
const noReservedNamespacesRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce token naming conventions and reserved namespaces (FR-020)',
    },
    messages: {
      invalidTokenName: 'Token name "{{name}}" does not match required pattern or allowed semantic exception.',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        const val = node.value;
        if (/^[a-z]+\.[^.]+\.[0-9]{2,3}$/.test(val)) {
          if (!(NAMING_REGEX.test(val) || SEMANTIC_EXCEPTIONS.test(val))) {
            context.report({ node, messageId: 'invalidTokenName', data: { name: val } });
          }
        }
      },
    };
  },
};

export const rules = {
  'no-inline-styles': noInlineStylesRule,
  'no-reserved-namespaces': noReservedNamespacesRule,
};

export default {
  rules,
};
