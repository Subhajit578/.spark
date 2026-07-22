FROM codercom/code-server:4.96.4

USER root
RUN apt-get update \
    && apt-get install -y curl zip unzip python3 python3-pip build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm

# Copy workspace config
COPY --chown=coder:coder package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages worker-backend depends on
COPY --chown=coder:coder packages/typescript-config /home/coder/packages/typescript-config
COPY --chown=coder:coder packages/db /home/coder/packages/db
COPY --chown=coder:coder packages/common /home/coder/packages/common
COPY --chown=coder:coder apps/worker-backend /home/coder/apps/worker-backend

# Copy startup script
COPY apps/code-server/start.sh /home/coder/start.sh
RUN chmod +x /home/coder/start.sh

WORKDIR /home/coder

# Install all dependencies (includes devDeps needed for tsc)
RUN pnpm install

# Build in dependency order
RUN pnpm --filter @repo/db build && \
    pnpm --filter @repo/common build && \
    pnpm --filter backend build

USER coder

RUN mkdir -p /home/coder/.config/code-server && \
    echo "auth: none" > /home/coder/.config/code-server/config.yaml

EXPOSE 8080 3001 5173

ENTRYPOINT ["/home/coder/start.sh"]
