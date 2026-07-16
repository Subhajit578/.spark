#!/bin/bash
node /home/coder/worker-backend/dist/index.js &
code-server --auth none --bind-addr 0.0.0.0:8080 /tmp/spark-worker
