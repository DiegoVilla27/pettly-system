import { ApplicationError } from './shared/domain/application-error';
import {
  USERS_USE_CASES,
  type UsersUseCases,
} from './modules/users/application/ports/in/users-use-cases';
import { BootstrapSuperAdminCommand } from './modules/users/application/commands/bootstrap-super-admin.command';
import { writeFileSync } from 'node:fs';
import { Logger } from '@nestjs/common';
import { createApplication } from './shared/infrastructure/http/application';
async function bootstrap() {
  const { app, settings, document } = await createApplication();
  if (process.argv[2] === '--bootstrap-super-admin') {
    if (!process.argv[3] || process.argv.length !== 4)
      throw new Error(
        'Expected --bootstrap-super-admin <verified-account-email>.',
      );
    try {
      await app.init();
      const user = await app
        .get<UsersUseCases>(USERS_USE_CASES)
        .bootstrapSuperAdmin(new BootstrapSuperAdminCommand(process.argv[3]));
      process.stdout.write(
        JSON.stringify({
          event: 'super_admin_bootstrapped',
          userId: user.id,
          globalRole: user.globalRole,
        }) + '\n',
      );
    } finally {
      await app.close();
    }
    return;
  }
  if (process.env.OPENAPI_OUTPUT) {
    writeFileSync(
      process.env.OPENAPI_OUTPUT,
      JSON.stringify(document, null, 2) + '\n',
    );
    await app.close();
    return;
  }
  await app.listen(settings.port, '0.0.0.0');
  Logger.log(`Pettly API listening on port ${settings.port}`, 'Bootstrap');
}
void bootstrap().catch((error: unknown) => {
  process.stderr.write(
    error instanceof ApplicationError
      ? `${error.code}: ${error.message}\n`
      : 'Pettly startup or operator command failed. Verify configuration and account eligibility.\n',
  );
  process.exitCode = 1;
});
