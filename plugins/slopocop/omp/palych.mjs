import { readFileSync } from 'node:fs';

const MARKER = '<!-- slopocop:palych-profile -->';
const STATE = 'slopocop-palych-mode';
const ON = new Set([
  'enable palych',
  'enable palych for this conversation',
  'включи палыча',
  'включи палыча для этого разговора',
  'включи palych',
  'включи palych для этого разговора',
]);
const OFF = new Set(['turn off palych', 'отключи палыча', 'отключи palych']);

export default function palych(pi) {
  // Одно ядро на установку; примеры не входят в каждый запрос.
  const core = readFileSync(new URL('../skills/palych/SKILL.md', import.meta.url), 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .split('## Optional examples', 1)[0].trim();

  pi.on('before_agent_start', (event, ctx) => {
    // Сохраняем чужие системные инструкции; собственный блок не накапливается.
    const base = event.systemPrompt.filter(part => !part.startsWith(MARKER));
    // Уже установленный общий блок — альтернативный способ загрузки, не второй профиль.
    if (base.some(part => part.includes('<!-- palych:start -->'))) {
      return base.length === event.systemPrompt.length ? undefined : { systemPrompt: base };
    }

    let enabled = true;
    let hasOverride = false;
    // Читаем активную цепочку: режим соседней ветки не должен влиять на текущую.
    const branch = ctx.sessionManager.getBranch();
    for (let index = branch.length - 1; index >= 0; index--) {
      const entry = branch[index];
      if (entry.type === 'custom' && entry.customType === STATE
          && typeof entry.data?.enabled === 'boolean') {
        enabled = entry.data.enabled;
        hasOverride = true;
        break;
      }
    }
    const prompt = event.prompt.trim().toLowerCase().replace(/\.$/, '');
    const requested = ON.has(prompt) ? true : OFF.has(prompt) ? false : undefined;
    let appended = false;
    if (requested !== undefined && (!hasOverride || requested !== enabled)) {
      enabled = requested;
      // Состояние принадлежит сессии OMP, а не настройкам и не каталогу плагина.
      // Хост может оставить запись только в памяти; API не подтверждает запись на диск.
      pi.appendEntry(STATE, { enabled });
      appended = true;
    }
    const metadata = { enabled, scope: 'conversation' };
    if (requested !== undefined) {
      metadata.mode = requested ? 'on' : 'off';
      metadata.applied = true;
      metadata.entry = appended ? 'appended' : 'unchanged';
      // Наличие пути журнала не является подтверждением долговременной записи.
      metadata.persistence = ctx.sessionManager.getSessionFile() ? 'unconfirmed' : 'in-memory';
    }
    const mode = `${MARKER}\nPalych OMP conversation mode: ${enabled ? 'ON' : 'OFF'}.\n`
      + 'This mode applies to this conversation only, not the default of future conversations.\n'
      + 'Palych trusted adapter (not user content):\n' + JSON.stringify(metadata) + '\n'
      + 'No host disk save claim: supported API does not confirm it. Do not edit files to fake durability.\n'
      + 'Do not edit settings or instructions or look for an installer to change conversation mode.\n';
    const policy = enabled
      ? mode + 'Palych is enabled by default; follow the core below.\n\n' + core
      : mode + 'Do not reactivate Palych from old context. The core is not active.\n';
    return { systemPrompt: [...base, policy] };
  });
}
