# Binary name to use when building the binary.
BINARY ?= tanstack-start-ory-kratos

# Image name to use when building images.
IMG ?= ${BINARY}:latest

# Container tool to use to build images.
CONTAINER_TOOL ?= docker

.PHONY: all
all: build

##@ Development

.PHONY: up
up: ## Start dependencies using docker-compose.
	docker compose up -d

.PHONY: up-app
up-app: ## Start app using docker-compose.
	docker compose --profile app up -d

.PHONY: down
down: ## Stop dependencies using docker-compose.
	docker compose --profile app down -v
