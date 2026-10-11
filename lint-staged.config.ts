import type { Configuration } from 'lint-staged';
import { Glob } from 'bun';

const glob = new Glob('**/*.ts?(x)');

const EXTRACT_APP_OR_LIB_FROM_PATH = /\/packages\/([a-zA-Z0-9-_]+)\//;

const config: Configuration = (stagedFiles: readonly string[]) => {
  // Unique list of apps or libs that have changed
  // so we can run commands just for them
  const changedAppsOrLibs = [
    ...new Set(
      stagedFiles.map((file) => EXTRACT_APP_OR_LIB_FROM_PATH.exec(file)?.[1]).filter((x) => x)
    ),
  ].filter((item) => item != null);

  const actions = [`bun run fmt --no-error-on-unmatched-pattern ${stagedFiles.join(' ')}`];

  // If we need to run typecheck, we should run it on all apps, libs, and their dependencies
  // this is what the ...item does (see https://bun.com/docs/pm/filter)
  const tsc = (() => {
    if (changedAppsOrLibs.length) {
      const filters = changedAppsOrLibs

        .map((item) => `--filter ...${item}`)
        .join(' ');
      return `bun run ${filters} typecheck`;
    }
    return null;
  })();

  const tsFiles = stagedFiles.filter((file) => glob.match(file));
  if (tsFiles.length > 0) {
    if (tsc && !actions.includes(tsc)) {
      actions.push(tsc);
    }
    actions.push(`bun run lint --fix ${tsFiles.join(' ')}`);
  }

  return actions;
};

export default config;
