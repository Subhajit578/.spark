#!/bin/bash

# Pull latest worker-backend source at startup so code changes don't need a new AMI
git clone --depth 1 https://github.com/code100x/mobile-magic-100x.git /tmp/spark-src 2>/dev/null

if [ -d /tmp/spark-src/apps/worker-backend/src ]; then
    cp -rf /tmp/spark-src/apps/worker-backend/src /home/coder/apps/worker-backend/src
    cd /home/coder
    pnpm --filter backend build 2>&1 | tail -5
fi

node /home/coder/apps/worker-backend/dist/index.js &
code-server --auth none --bind-addr 0.0.0.0:8080 /tmp/spark-worker
