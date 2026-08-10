import prisma from './db';

type Scope = 'FETCH' | 'AI' | 'IMAGE' | 'PUBLISH' | 'SITEMAP' | 'DB' | 'SOCIAL' | 'SYSTEM';
type Level = 'INFO' | 'WARN' | 'ERROR';

// Structured logger that mirrors to console AND the ErrorLog table so the
// admin "Logs" view and automation timeline (spec §79) reflect every action.
export async function log(
  scope: Scope,
  message: string,
  opts: { level?: Level; meta?: unknown } = {},
): Promise<void> {
  const level = opts.level ?? 'INFO';
  const line = `[${new Date().toISOString()}] ${level} ${scope}: ${message}`;
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);

  try {
    await prisma.errorLog.create({
      data: {
        scope,
        level,
        message: message.slice(0, 2000),
        meta: opts.meta ? JSON.stringify(opts.meta).slice(0, 4000) : null,
      },
    });
  } catch {
    // Never let logging failures break the pipeline (spec §46/§86).
  }
}

export const logInfo = (scope: Scope, m: string, meta?: unknown) => log(scope, m, { level: 'INFO', meta });
export const logWarn = (scope: Scope, m: string, meta?: unknown) => log(scope, m, { level: 'WARN', meta });
export const logError = (scope: Scope, m: string, meta?: unknown) => log(scope, m, { level: 'ERROR', meta });
