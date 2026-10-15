FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 TREINOS_DIR=/app/treinos
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY shared ./shared
COPY treinos ./treinos
COPY --from=build /app/dist ./dist
# a pasta dos treinos (um .json por treino); monte um volume ou uma pasta sua aqui para guardar/editar os treinos
VOLUME /app/treinos
EXPOSE 3000
CMD ["node", "server/index.js"]
