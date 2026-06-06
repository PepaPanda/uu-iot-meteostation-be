#!/bin/sh
set -e

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
fi

docker compose up -d postgres adminer

docker compose --profile setup up --build --abort-on-container-exit --exit-code-from db-migrate db-migrate
docker compose --profile setup up --build --abort-on-container-exit --exit-code-from db-seed db-seed
docker compose --profile setup up --build --abort-on-container-exit --exit-code-from db-create-test-user db-create-test-user

docker compose up --build api