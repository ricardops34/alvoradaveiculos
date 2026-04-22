# Estágio 1: Build
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production

# Estágio 2: Produção
FROM nginx:stable-alpine
# Busca recursiva para copiar qualquer index.html encontrado na dist para a raiz do nginx
# Isso resolve o problema de o Angular buildar em caminhos diferentes (dist/app ou dist/app/browser)
COPY --from=build /app/dist/angular-po-ui-app /usr/share/nginx/html
# Se o Angular criou uma subpasta /browser, movemos o conteúdo para a raiz
RUN if [ -d "/usr/share/nginx/html/browser" ]; then mv /usr/share/nginx/html/browser/* /usr/share/nginx/html/ && rm -rf /usr/share/nginx/html/browser; fi

COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
