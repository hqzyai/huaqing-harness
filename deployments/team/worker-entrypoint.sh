#!/bin/sh
set -eu
worker_bind=$(hostname -i | awk '{print $1}')
exec node /opt/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js --profile team-worker --no-open --host "$worker_bind" --port 3080
