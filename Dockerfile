FROM node:lts as builder

WORKDIR /build
COPY package.json yarn.lock /build/
RUN yarn install
COPY . .
RUN yarn build

FROM node:lts-alpine3.13

# Add init and su-exec
RUN apk add --no-cache tini su-exec

# Add the playwright user (playwright)
RUN addgroup playwright && adduser --disabled-password --gecos "" playwright -G playwright \
    && mkdir -p /home/playwright/Downloads \
    && chown -R playwright:playwright /home/playwright

WORKDIR /usr/local/app
COPY package.json yarn.lock /usr/local/app/
RUN yarn install --production

COPY --from=builder /build/dist /usr/local/app

ENTRYPOINT ["tini", "-g", "--"]
CMD ["su-exec", "playwright", "node", "/usr/local/app/index.js"]
