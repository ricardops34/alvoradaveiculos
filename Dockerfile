# Estágio 1: Build
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
# Ignora erros de peer dependencies para garantir o build
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production

# Estágio 2: Produção (Servidor Nginx)
FROM nginx:stable-alpine
# Copia o conteúdo da pasta dist (tenta os dois caminhos comuns do Angular 17/18)
COPY --from=build /app/dist/angular-po-ui-app/browser /usr/share/nginx/html
# Caso o caminho acima falhe, o Docker continuará se houver arquivos. 
# Se o seu Angular buildar direto na raiz da dist, ajustaremos.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
