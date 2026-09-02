FROM node:20-alpine AS base
WORKDIR /app

# Build context is the pharmaconnect/ root (see render.yaml dockerContext) so this
# image can share the Prisma schema without copying files from outside the context.
COPY realtime/package.json realtime/package-lock.json* ./
RUN npm ci --omit=dev || npm install
COPY realtime/ .
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/server.js"]
