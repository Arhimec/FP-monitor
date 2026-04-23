module.exports = {
  apps: [
    {
      name: 'floor-price-monitor',
      script: 'server.ts',
      interpreter: 'node',
      // Since we use ESM and TypeScript, we use tsx to run it without a build step
      // Or we build it first and run the 'dist' version.
      // For PM2 directly on TS files:
      interpreter_args: '--import tsx',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        VITE_BASE_PATH: '/fp-monitor/'
      }
    }
  ]
};
