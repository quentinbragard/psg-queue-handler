#!/bin/bash
# This script ensures that if the server crashes, it will automatically restart

while true; do
  echo "Starting server.js..."
  node server.js
  echo "Server crashed or exited. Restarting in 5 seconds..."
  sleep 5
done