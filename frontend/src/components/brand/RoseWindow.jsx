const PETALAS = 8;
const LOBULOS = 16;

function pontoNoCirculo(raio, indice, total, deslocamento = 0) {
  const angulo = ((indice + deslocamento) / total) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.cos(angulo) * raio, y: Math.sin(angulo) * raio };
}

/** Rosácea de vitral desenhada só com círculos e raios, em traço de latão. */
export function RoseWindow({ className }) {
  const petalas = Array.from({ length: PETALAS }, (_, i) => pontoNoCirculo(58, i, PETALAS));
  const lobulos = Array.from({ length: LOBULOS }, (_, i) => pontoNoCirculo(130, i, LOBULOS, 0.5));
  const raios = Array.from({ length: LOBULOS }, (_, i) => ({
    de: pontoNoCirculo(26, i, LOBULOS),
    ate: pontoNoCirculo(112, i, LOBULOS),
  }));

  return (
    <svg className={className} viewBox="-160 -160 320 320" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.1">
        <circle r="156" />
        <circle r="148" />
        <circle r="112" />
        {lobulos.map(({ x, y }) => (
          <circle key={`l${x}${y}`} cx={x} cy={y} r="17" />
        ))}
        {raios.map(({ de, ate }) => (
          <line key={`r${ate.x}${ate.y}`} x1={de.x} y1={de.y} x2={ate.x} y2={ate.y} />
        ))}
        {petalas.map(({ x, y }) => (
          <circle key={`p${x}${y}`} cx={x} cy={y} r="56" />
        ))}
        <circle r="26" />
        <circle r="9" />
      </g>
    </svg>
  );
}
