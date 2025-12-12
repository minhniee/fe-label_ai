FROM node:22.17.0-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

RUN mv ./entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ARG NEXT_PUBLIC_API_BASE
ARG NEXT_PUBLIC_SITE_URL


ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}


RUN npm run build

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["npm","run","start"]
