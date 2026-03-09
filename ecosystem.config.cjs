module.exports = {
  apps: [
    {
      name: 'skills-matrix',
      script: 'server.js',
      cwd: __dirname,
      watch: ['server.js'],
      ignore_watch: ['node_modules', 'templates'],
      env: {
        NODE_ENV: 'development',
        PORT: 5500,
      },
    },
  ],
};
