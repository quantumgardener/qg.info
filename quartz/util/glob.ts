import path from "path"
import { FilePath } from "./path"
import { globby } from "globby"

export function toPosixPath(fp: string): string {
  return fp.split(path.sep).join("/")
}

export async function glob(
  pattern: string,
  cwd: string,
  ignorePatterns: string[],
): Promise<FilePath[]> {
  const posixCwd = toPosixPath(cwd)
  const posixIgnore = ignorePatterns.map(toPosixPath)

  const fps = (
    await globby(pattern, {
      cwd: posixCwd,
      ignore: posixIgnore,
      gitignore: false,   // IMPORTANT: globby 16 changed behaviour
      absolute: false,
    })
  ).map(toPosixPath)

  return fps as FilePath[]
}