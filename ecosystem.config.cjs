module.exports = {
  apps: [
    {
      name: 'skills-matrix',
      script: 'bdd/server.js',
      cwd: __dirname,
      watch: ['bdd/server.js'],
      ignore_watch: ['node_modules', 'templates'],
      env: {
        NODE_ENV: 'development',
        PORT: 5500,
        PB_PORT: 8140,
      },
    },
    {
      name: 'skills-matrix-pb',
      script: 'bdd/pocketbase',
      args: 'serve --http=0.0.0.0:8140 --dir=bdd/pb_data --migrationsDir=bdd/pb_migrations',
      cwd: __dirname,
      autorestart: true,
      watch: false,
    },
  ],
};
