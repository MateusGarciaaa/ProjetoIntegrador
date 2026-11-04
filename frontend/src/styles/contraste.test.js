import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function cor(nome) {
  const achado = css.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})`));
  if (!achado) throw new Error(`Token --color-${nome} não encontrado`);
  return achado[1];
}

/** Razão de contraste da WCAG 2.x entre duas cores #rrggbb. */
function contraste(a, b) {
  const luminancia = (hex) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (escuro + 0.05);
}

const FUNDOS = ['surface', 'surface-sunken', 'canvas'];

describe('contraste dos tokens (WCAG AA)', () => {
  it.each(['ink', 'ink-muted', 'ink-subtle', 'accent-text', 'focus', 'danger', 'success', 'warning', 'info', 'primary'])(
    'texto --color-%s tem pelo menos 4,5:1 sobre os fundos claros',
    (texto) => {
      FUNDOS.forEach((fundo) => expect(contraste(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(4.5));
    },
  );

  it('texto secundário também é legível sobre o fundo do item ativo do menu', () => {
    expect(contraste(cor('ink-subtle'), cor('primary-soft'))).toBeGreaterThanOrEqual(4.5);
  });

  it('a borda dos campos tem pelo menos 3:1 (1.4.11, componentes de interface)', () => {
    FUNDOS.forEach((fundo) => expect(contraste(cor('line-control'), cor(fundo))).toBeGreaterThanOrEqual(3));
  });
});
