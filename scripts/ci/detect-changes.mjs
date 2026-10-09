import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function classifyChanges(files, force = false) {
  const result = {
    api: force,
    web: force,
    admin: force,
    mobile: force,
    docker: force,
  };
  const shared =
    /^(?:package\.json|pnpm-(?:lock\.yaml|workspace\.yaml)|nx\.json|tsconfig[^/]*\.json|eslint\.config\.mjs|\.nvmrc|\.prettier(?:rc|ignore)|\.github\/|scripts\/ci\/|packages\/|libs\/)/;
  for (const file of files) {
    if (shared.test(file)) {
      for (const project of Object.keys(result)) result[project] = true;
    }
    for (const project of ['api', 'web', 'admin', 'mobile']) {
      if (file.startsWith(`apps/${project}/`)) result[project] = true;
    }
    if (
      /^(?:apps\/worker\/|scripts\/testing\/|scripts\/(?:check-api-architecture|build-worker|export-openapi|bootstrap-super-admin)\.mjs$)/.test(
        file,
      )
    )
      result.api = true;
    if (
      /^(?:docker-compose[^/]*\.ya?ml|\.dockerignore|\.env\.example)$/.test(
        file,
      )
    )
      result.docker = true;
  }
  if (result.api || result.web || result.admin) result.docker = true;
  return result;
}

export function checkBranchPolicy(event, base, head, headRepo, repo) {
  if (
    event === 'pull_request' &&
    base === 'main' &&
    (head !== 'dev' || headRepo !== repo)
  ) {
    throw new Error(
      'Los PR hacia main deben proceder de la rama dev de este repositorio.',
    );
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const env = process.env;
  checkBranchPolicy(
    env.EVENT_NAME,
    env.BASE_BRANCH,
    env.HEAD_BRANCH,
    env.HEAD_REPO,
    env.GITHUB_REPOSITORY,
  );
  let force =
    env.EVENT_NAME === 'workflow_dispatch' && env.FORCE_ALL === 'true';
  let files = [];
  if (!force) {
    let base = env.BASE_SHA;
    if (env.EVENT_NAME === 'workflow_dispatch') {
      try {
        base = execFileSync('git', ['rev-parse', 'HEAD^'], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      } catch {
        force = true;
      }
    }
    const head = env.HEAD_SHA || 'HEAD';
    if (force || !base || /^0+$/.test(base)) force = true;
    else {
      const range =
        env.EVENT_NAME === 'pull_request'
          ? `${base}...${head}`
          : `${base}..${head}`;
      files = execFileSync('git', ['diff', '--name-only', '-z', range], {
        encoding: 'utf8',
      })
        .split('\0')
        .filter(Boolean);
    }
  }
  const result = classifyChanges(files, force);
  if (env.GITHUB_OUTPUT) {
    appendFileSync(
      env.GITHUB_OUTPUT,
      Object.entries(result)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n') + '\n',
    );
  }
  console.log(JSON.stringify({ files, force, projects: result }, null, 2));
}
