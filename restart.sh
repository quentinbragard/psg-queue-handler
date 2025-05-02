#!/bin/bash
# This script ensures that if the server crashes, it will automatically restart

# Make the script executable
chmod +x healthcheck.js

echo "Starting PSG Queue Handler service..."
# Print system info for debugging
echo "System information:"
uname -a
node -v
npm -v

# Check if Chrome is installed
if command -v google-chrome-stable &> /dev/null; then
  echo "✅ Chrome is installed: $(google-chrome-stable --version)"
else
  echo "❌ Chrome is not installed"
  exit 1
fi

# Keep restarting the server if it crashes
while true; do
  echo "$(date): Starting server..."
  node startup-log.js
  EXIT_CODE=$?
  
  if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date): Server exited cleanly."
  else
    echo "$(date): Server crashed with exit code $EXIT_CODE."
  fi
  
  echo "Restarting in 5 seconds..."
  sleep 5
done