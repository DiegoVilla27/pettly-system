import path from 'node:path';

const quote = (file) => JSON.stringify(file);
const codePattern = /\.[cm]?[jt]sx?$/;
const formatPattern = /\.(?:[cm]?[jt]sx?|json|css|scss|html|md|ya?ml)$/;

export default {
  '*': (files) => {
    const relative = (file) =>
      path.relative(process.cwd(), file).split(path.sep).join('/');
    const commands = [];
    const formatted = files.filter(
      (file) =>
        !relative(file).startsWith('apps/mobile/') && formatPattern.test(file),
    );
    if (formatted.length)
      commands.push(
        `pnpm exec prettier --write ${formatted.map(quote).join(' ')}`,
      );

    for (const project of ['api', 'web', 'admin']) {
      const projectFiles = files.filter((file) =>
        relative(file).startsWith(`apps/${project}/`),
      );
      const lintFiles = projectFiles.filter(
        (file) =>
          codePattern.test(file) ||
          (project === 'admin' && file.endsWith('.html')),
      );
      if (lintFiles.length) {
        commands.push(
          `pnpm exec eslint --config apps/${project}/eslint.config.mjs --fix --no-warn-ignored ${lintFiles.map(quote).join(' ')}`,
        );
        commands.push(`pnpm nx typecheck ${project}`);
      }
    }
    const shared = files.filter(
      (file) => !relative(file).startsWith('apps/') && codePattern.test(file),
    );
    if (shared.length)
      commands.push(`pnpm exec eslint --fix ${shared.map(quote).join(' ')}`);
    const dart = files.filter(
      (file) =>
        relative(file).startsWith('apps/mobile/') && file.endsWith('.dart'),
    );
    if (dart.length) commands.push(`dart format ${dart.map(quote).join(' ')}`);
    if (
      dart.length ||
      files.some((file) =>
        /apps\/mobile\/(pubspec\.(yaml|lock)|analysis_options\.yaml)$/.test(
          relative(file),
        ),
      )
    ) {
      commands.push('pnpm nx lint mobile');
    }
    return commands;
  },
};
