import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, realpathSync } from "node:fs";
import type { BigIntStats } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Max bytes read off disk and shipped to a bank in one ingest or one batch file. */
export const MAX_PROJECT_FILE_BYTES = 2 * 1024 * 1024;

export interface ProjectFile {
  path: string;
  bytes: Buffer;
}

class ProjectFileError extends Error {}

function contained(path: string, root: string): boolean {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function unchanged(before: BigIntStats, after: BigIntStats): boolean {
  return after.isFile() && before.dev === after.dev && before.ino === after.ino &&
    before.size === after.size && before.mtimeNs === after.mtimeNs && before.ctimeNs === after.ctimeNs;
}

/**
 * Привязывает regular-файл внутри проекта к проверяемому дескриптору.
 * Допустимые внутренние ссылки разрешаются один раз; подмена/изменение/частичное чтение — отказ.
 * Ошибки содержат фиксированную причину, без OS paths и содержимого файла.
 */
export function readProjectFile(input: string, projectRoot: string): ProjectFile {
  try {
    const rootInput = resolve(projectRoot);
    const root = realpathSync(rootInput);
    const requested = resolve(input);
    const path = realpathSync(requested);
    if (!contained(path, root)) {
      throw new ProjectFileError("refusing to read project file outside the project root");
    }
    const before = lstatSync(path, { bigint: true });
    if (!before.isFile()) {
      throw new ProjectFileError("refusing to read project file: not a regular file");
    }
    if (before.size > BigInt(MAX_PROJECT_FILE_BYTES)) {
      throw new ProjectFileError(`refusing to read project file: exceeds the ${MAX_PROJECT_FILE_BYTES}-byte cap`);
    }
    const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0));
    try {
      const verify = () => {
        if (!unchanged(before, fstatSync(fd, { bigint: true })) ||
            realpathSync(rootInput) !== root || realpathSync(requested) !== path ||
            realpathSync(path) !== path || !contained(path, root) ||
            !unchanged(before, lstatSync(path, { bigint: true }))) {
          throw new ProjectFileError("refusing to read project file: file changed while reading");
        }
      };
      // До чтения должны совпасть идентичность дескриптора и текущие canonical paths.
      verify();
      const size = Number(before.size);
      const bytes = Buffer.allocUnsafe(size + 1);
      let length = 0;
      while (length <= size) {
        const count = readSync(fd, bytes, length, bytes.length - length, length);
        if (count === 0) break;
        length += count;
      }
      if (length !== size) {
        throw new ProjectFileError("refusing to read project file: file changed while reading");
      }
      verify();
      return { path, bytes: bytes.subarray(0, length) };
    } finally {
      closeSync(fd);
    }
  } catch (error) {
    if (error instanceof ProjectFileError) throw error;
    throw new ProjectFileError("refusing to read project file: unavailable or changed file");
  }
}
