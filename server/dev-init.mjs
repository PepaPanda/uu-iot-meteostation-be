import { existsSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function run(command, args) {
  console.log(`> ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit' });
}

if (!existsSync('.env')) {
  copyFileSync('.env.example', '.env');
  console.log('Created .env from .env.example');
}

run('docker', ['compose', 'up', '-d', 'postgres', 'adminer']);

run('docker', ['compose', 'run', '--rm', '--build', 'db-migrate']);
run('docker', ['compose', 'run', '--rm', '--build', 'db-seed']);
run('docker', ['compose', 'run', '--rm', '--build', 'db-create-test-user']);

run('docker', ['compose', 'up', '--build', 'api']);