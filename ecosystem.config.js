// PM2 process config for running ApneNews (Next.js) on a Hostinger VPS.
// `next start` auto-loads .env / .env.production, so DATABASE_URL, AUTH_SECRET,
// CRON_SECRET, APP_URL etc. are read from the .env file in this directory.
// Adjust `cwd` if you clone the app somewhere other than /var/www/apnenews.
module.exports = {
  apps: [
    {
      name: 'apnenews',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      cwd: '/var/www/apnenews',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },
  ],
};
