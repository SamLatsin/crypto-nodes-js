FROM node:16.18.0

WORKDIR /usr/src/app/

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5656

CMD [ "npm", "run", "start" ]