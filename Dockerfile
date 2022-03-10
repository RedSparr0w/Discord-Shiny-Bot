# docker-compose build --no-cache
FROM node:16-alpine
# Bundle APP files
COPY ./ecosystem.config.js .

# Install app dependencies
ENV NPM_CONFIG_LOGLEVEL warn
ENV PYTHONUNBUFFERED=1
RUN apk add --no-cache \
    git \
    tesseract-ocr \
    python3 make gcc g++\
    ;

# needed for sqlite install
RUN ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

RUN npm i pm2 -g
RUN pm2 install pm2-auto-pull

## Setup the bots folder
RUN mkdir -p /usr/src/bot
WORKDIR /usr/src/bot
# Copy and Install our bot
COPY ./package.json /usr/src/bot
COPY ./package-lock.json /usr/src/bot
RUN npm ci

# Show current folder structure in logs
RUN ls -al -R

CMD [ "pm2-runtime", "start", "ecosystem.config.js" ]

# NOTES:
# To re-build without cache:
# docker-compose build --no-cache