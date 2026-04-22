# Estágio 1: Build
FROM node:20-alpine as build
# Aumenta a memória disponível para o Node (evita erros em containers pequenos)
ENV NODE_OPTIONS="--max-old-space-size=4096"
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
# Build em modo produção
RUN npm run build -- --configuration production

# Estágio 2: Produção
FROM nginx:stable-alpine
COPY --from=build /app/dist/angular-po-ui-app /usr/share/nginx/html
RUN if [ -d "/usr/share/nginx/html/browser" ]; then mv /usr/share/nginx/html/browser/* /usr/share/nginx/html/ && rm -rf /usr/share/nginx/html/browser; fi
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
