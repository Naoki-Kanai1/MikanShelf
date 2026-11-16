FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

# SQLite CLI (DB の中身を確認するため)
RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 \
    && rm -rf /var/lib/apt/lists/*
