#!/bin/bash
set -e

# Create a temporary directory for the build
TEMP_DIR="$(mktemp -d)"
echo "Created temporary directory: $TEMP_DIR"

# Copy all files except supabase/functions to the temp directory
rsync -av --exclude='supabase/functions' --exclude='.git' --exclude='node_modules' . "$TEMP_DIR/"

# Navigate to the temp directory
cd "$TEMP_DIR"

# Install dependencies
echo "Installing dependencies..."
npm install

# Build the application
echo "Building application..."
npm run build

# Copy the built files back to the original directory (except node_modules)
echo "Copying built files..."
rsync -av --exclude='node_modules' "$TEMP_DIR/dist/" "/vercel/output/static/"

# Clean up
echo "Cleaning up..."
rm -rf "$TEMP_DIR"

echo "Build completed successfully!"
