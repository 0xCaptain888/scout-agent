FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --frozen-lockfile || npm install

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx tsup src/index.ts --format esm --dts

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prompts ./prompts

EXPOSE 3001

CMD ["node", "dist/index.js"]
