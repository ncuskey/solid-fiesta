#!/usr/bin/env bash
# Small helper script to vendor three/examples/jsm/ modules locally.
# This script is intentionally conservative: it does not fetch remote code
# by default. Instead it prints a suggested rsync/curl command and can run
# in a dry-run mode. Use at your own discretion and verify licenses.

SETUP_DIR="vendor/three/examples/jsm"
THREE_VERSION="0.161.0"

echo "This helper will show how to vendor three/examples/jsm/ for Three.js ${THREE_VERSION}."
echo "It will NOT download anything unless you edit the URL or run the provided curl commands yourself."

echo
echo "Suggested manual steps:"
echo "1) Create vendor directory: mkdir -p ${SETUP_DIR}"
echo "2) Download needed modules (examples):"
echo "   e.g. curl -o ${SETUP_DIR}/controls/OrbitControls.js https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}/examples/jsm/controls/OrbitControls.js"
echo "   Repeat for other modules you need (loaders, postprocessing, etc)."
echo "3) Update import map or replace imports to local paths: import { OrbitControls } from '/${SETUP_DIR}/controls/OrbitControls.js'"

echo
echo "Note: vendoring copies third-party code into your repo. Verify the license and team policy before proceeding."

exit 0
