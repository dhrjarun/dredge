#!/bin/bash

# Ensure the script exits if a command fails
set -e

usage() {
  echo "Usage: $0 [--filter <filter_string>]"
  exit 1
}

# Parse arguments
FILTER=""

while [[ "$#" -gt 0 ]]; do
  case $1 in
  --filter)
    FILTER="$2"
    shift 2
    ;;
  *)
    echo "Unknown argument: $1"
    usage
    ;;
  esac
done

# Find all *.bench.ts files in the current directory
FILES=$(find ./test -type f -name "*.bench.ts")

# Apply filter if specified
if [[ -n "$FILTER" ]]; then
  FILES=$(echo "$FILES" | grep "$FILTER")
fi

# Check if there are any matching files
if [[ -z "$FILES" ]]; then
  echo "No matching files found."
  exit 0
fi

# Execute each matching file with tsx
echo "Executing the following files:"
echo "$FILES"

for FILE in $FILES; do
  echo "Running: $FILE"
  npx tsx "$FILE"
done
