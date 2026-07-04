#!/usr/bin/env bash
set -e

echo "Running Database Setup..."
python utils/db_setup.py

echo "Starting Uvicorn Server..."
uvicorn api.app:app --host 0.0.0.0 --port ${PORT:-10000}
