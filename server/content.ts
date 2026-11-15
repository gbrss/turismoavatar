// Rutas y formato de los archivos de contenido que el panel publica en el repositorio.
export const COLLECTIONS = ['experiencias', 'alojamientos'] as const;
export type Coleccion = (typeof COLLECTIONS)[number];

export function targetPath(target: string): string | null {
  if (target === 'home') return 'src/content/pages/home.json';
  const m = /^(experiencias|alojamientos)\/([a-z0-9-]{1,80})$/.exec(target);
  return m ? `src/content/${m[1]}/${m[2]}.md` : null;
}

/** Frontmatter YAML (valores en JSON, que también es YAML válido) + cuerpo en Markdown. */
export function toMarkdown(fm: Record<string, unknown>, body: string) {
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n${body.trim()}\n`;
}

// Validación mínima (la definitiva la hace el build con el esquema de src/content.config.ts)
export function validate(col: Coleccion, fm: Record<string, unknown>): string | null {
  const str = (k: string) => typeof fm[k] === 'string' && (fm[k] as string).trim().length > 0;
  const int = (k: string) => Number.isInteger(fm[k]) && (fm[k] as number) > 0;
  if (!str('title')) return 'Falta el título';
  if (!str('summary')) return 'Falta el resumen';
  if (!str('image')) return 'Falta la foto principal';
  if (col === 'experiencias') {
    if ((fm.summary as string).length > 220) return 'El resumen debe tener máximo 220 caracteres';
    if (!str('duration')) return 'Falta la duración';
    if (!Array.isArray(fm.destinos) || !fm.destinos.length) return 'Elige al menos un destino';
    if (fm.priceFrom !== undefined && !int('priceFrom')) return 'El precio debe ser un número entero';
  } else {
    if (!str('destino') || !str('location')) return 'Falta el destino o la ubicación';
    if (!int('pricePerNight') || !int('capacity') || !int('beds')) return 'Precio por noche, capacidad y camas deben ser números';
    if (!str('wpSlug')) fm.wpSlug = 'panel';
  }
  return null;
}
