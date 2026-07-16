FROM codercom/code-server:4.96.4

USER root
RUN apt-get update \
    && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy and build worker-backend
COPY --chown=coder:coder worker-backend /home/coder/worker-backend
WORKDIR /home/coder/worker-backend
RUN npm install && npm run build

# Copy startup script
COPY start.sh /home/coder/start.sh
RUN chmod +x /home/coder/start.sh

USER coder

EXPOSE 8080 3001 5173

CMD ["/home/coder/start.sh"]