FROM node:22.17.0-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

RUN mv ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

RUN npm run build

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["npm","run","start"]
