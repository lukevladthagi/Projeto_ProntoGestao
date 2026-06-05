FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN corepack enable

COPY . .

RUN yarn install --immutable
RUN yarn workspace web build

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=4000

RUN corepack enable

COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 4000

CMD ["yarn", "workspace", "web", "start"]
