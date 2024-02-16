FROM node:lts-bookworm-slim

# The base name of the npm package
ARG LINKSPECTOR_NAME=@umbrelladocs/linkspector
# Use the argument below to select version to install, e.g.:
# docker build --build-arg LINKSPECTOR_VERSION=0.2.7 -t umbrelladocs/linkspector .
ARG LINKSPECTOR_VERSION=latest
# Use the argument below the specify full package name to install,
# empty value installs current directory, e.g.:
# docker build --build-arg LINKSPECTOR_PACKAGE= -t umbrelladocs/linkspector .
ARG LINKSPECTOR_PACKAGE=${LINKSPECTOR_NAME}@${LINKSPECTOR_VERSION}

# Set default user
ENV USER=node

# Set installation location for node packages
ENV NPM_GLOBAL=/home/${USER}/.npm-global
ENV PATH=${NPM_GLOBAL}/bin:$PATH

# Install chromium instead of puppeteer chrome
# as puppeteer does not provide arm64
# https://github.com/puppeteer/puppeteer/issues/7740
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium.wrapper

# Install linkspector dependencies
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    chromium \
    curl \
    git \
    upower \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create app directory for mounting host files
RUN mkdir /app && chown ${USER}:${USER} /app

# chromium in order to start either needs dbus https://github.com/puppeteer/puppeteer/issues/11028
# or skip dbus by using --remote-debugging-port=0 (any free port) https://github.com/nodejs/help/issues/3220#issuecomment-1228342313
# Additionally, allow chromium to start without elevated capabilities needed to start the sandbox
# See https://github.com/puppeteer/puppeteer/issues/5505
RUN echo /usr/bin/chromium \
         --no-sandbox \
         --headless=new \
         --disable-gpu \
         --enable-chrome-browser-cloud-management \
         --remote-debugging-port=0 \
         > /usr/bin/chromium.wrapper
RUN chmod ugo+x /usr/bin/chromium.wrapper

# Install linkspector as node user
USER ${USER}
WORKDIR /home/${USER}
RUN npm config set prefix ${NPM_GLOBAL}
COPY --chown=${USER}:${USER} lib lib
COPY --chown=${USER}:${USER} *.js *.json test ./
# npm ci does not support --global
# https://github.com/npm/cli/issues/7224
RUN if test -z ${LINKSPECTOR_PACKAGE}; then npm ci; fi && npm install --global ${LINKSPECTOR_PACKAGE}

WORKDIR /app

# Run sanity checks
RUN npm list --global
RUN linkspector --version
RUN linkspector check
