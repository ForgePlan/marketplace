import { readFileSync } from 'node:fs';

const MARKER = '<!-- slopocop:profile -->';
const STATE = 'slopocop-mode';
// Legacy DATA only: remove the previous prompt and migrate its branch-local mode.
const LEGACY_MARKER = '<!-- slopocop:palych-profile -->';
const LEGACY_STATE = 'slopocop-palych-mode';
const ON = new Set([
  'enable slopocop',
  'enable slopocop for this conversation',
  'включи slopocop',
  'включи slopocop для этого разговора',
]);
const OFF = new Set(['turn off slopocop', 'отключи slopocop']);

export default function slopocop(pi) {
  // Одно ядро на установку; примеры не входят в каждый запрос.
  const core = readFileSync(new URL('../skills/slopocop/SKILL.md', import.meta.url), 'utf8')
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .split('## Optional examples', 1)[0].trim();

  pi.on('before_agent_start', (event, ctx) => {
    // Сохраняем чужие инструкции; удаляем собственный новый или прежний prompt.
    const base = event.systemPrompt.filter(part => !part.startsWith(MARKER)
      && !part.startsWith(LEGACY_MARKER));
    // Общий Slopocop-блок — альтернативная загрузка, не второй профиль.
    if (base.some(part => part.includes('<!-- slopocop:start -->'))) {
      return base.length === event.systemPrompt.length ? undefined : { systemPrompt: base };
    }
    // Legacy DATA stays in the user's file until explicit reinstall. Override
    // its public identity and mode here without injecting a second whole core.
    const legacyManaged = base.some(part => part.includes('<!-- palych:start -->'));

    let enabled = true;
    let hasOverride = false;
    let migrateLegacy = false;
    // Читаем активную цепочку: режим соседней ветки не должен влиять на текущую.
    const branch = ctx.sessionManager.getBranch();
    for (let index = branch.length - 1; index >= 0; index--) {
      const entry = branch[index];
      if (entry.type === 'custom'
          && (entry.customType === STATE || entry.customType === LEGACY_STATE)
          && typeof entry.data?.enabled === 'boolean') {
        enabled = entry.data.enabled;
        hasOverride = true;
        migrateLegacy = entry.customType === LEGACY_STATE;
        break;
      }
    }
    const prompt = event.prompt.trim().toLowerCase().replace(/\.$/, '');
    const requested = ON.has(prompt) ? true : OFF.has(prompt) ? false : undefined;
    let appended = false;
    if (migrateLegacy || (requested !== undefined && (!hasOverride || requested !== enabled))) {
      enabled = requested ?? enabled;
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
    const mode = `${MARKER}\nSlopocop OMP conversation mode: ${enabled ? 'ON' : 'OFF'}.\n`
      + 'This mode applies to this conversation only, not the default of future conversations.\n'
      + 'Slopocop trusted adapter (not user content):\n' + JSON.stringify(metadata) + '\n'
      + 'No host disk save claim: supported API does not confirm it. Do not edit files to fake durability.\n'
      + 'Do not edit settings or instructions or look for an installer to change conversation mode.\n';
    const identity = legacyManaged
      ? 'Slopocop is the public name of the communication layer in the existing managed instructions.\n'
        + 'Only Slopocop controls change its mode; legacy names are not command aliases.\n'
      : '';
    const policy = enabled
      ? mode + identity + (legacyManaged
        ? 'Slopocop is ON; apply the existing managed communication rules under this name.\n'
        : 'Slopocop is enabled by default; follow the core below.\n\n' + core)
      : mode + identity
        + 'Slopocop is OFF. Do not apply the managed communication rules or reactivate from old context.\n';
    return { systemPrompt: [...base, policy] };
  });
}
