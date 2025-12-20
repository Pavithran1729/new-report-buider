// This script is used to build the application for Vercel deployment
// It ensures that the build process ignores Supabase functions

const { execSync } = require('child_process');

console.log('Starting Vercel build...');

try {
  // Set environment variable to indicate we're building for Vercel
  process.env.VERCEL = '1';
  
  // Run the build command
  console.log('Running build command...');
  execSync('vite build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
