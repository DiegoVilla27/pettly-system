import { execFileSync } from 'node:child_process';

const files = ['-f', 'docker-compose.yml', '-f', 'docker-compose.ci.yml'];
const compose = JSON.parse(
  execFileSync('docker', ['compose', ...files, 'config', '--format', 'json'], {
    encoding: 'utf8',
  }),
);
const bake = JSON.parse(
  execFileSync('docker', ['buildx', 'bake', ...files, '--print'], {
    encoding: 'utf8',
  }),
);
for (const name of ['api', 'web', 'admin']) {
  const image = compose.services[name].image;
  if (!image || !bake.target[name]?.tags?.includes(image))
    throw new Error(
      `Bake debe etiquetar ${name} con la imagen de Compose: ${image}`,
    );
  console.log(`${name}: Bake y Compose usan ${image}`);
}
