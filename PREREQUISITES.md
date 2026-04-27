# Prerequisites

This guide covers system requirements for installing linkspector via `npm install -g`. If you prefer to avoid manual setup, use the [Docker image](README.md#docker) instead.

## Node.js

Linkspector requires **Node.js 18.18.0 or later**.

The versions shipped with Ubuntu 22.04 and 24.04 LTS are too old. Use one of the following to get a supported version:

- [NodeSource packages](https://github.com/nodesource/distributions)
- [nvm](https://github.com/nvm-sh/nvm)
- [fnm](https://github.com/Schniz/fnm)

Verify your version:

```bash
node --version   # must be >= 18.18.0
```

## System libraries (Linux)

Puppeteer needs Chromium, which depends on shared libraries that are not always present on minimal or container images.

### Debian / Ubuntu

```bash
sudo apt-get update && sudo apt-get install -y --no-install-recommends \
  ca-certificates \
  chromium \
  curl \
  git \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils
```

### Fedora / RHEL

```bash
sudo dnf install -y \
  chromium \
  git \
  alsa-lib \
  atk \
  cups-libs \
  gtk3 \
  libXcomposite \
  libXdamage \
  libXrandr \
  libdrm \
  libgbm \
  nss \
  xdg-utils
```

### macOS

No extra libraries are needed. Puppeteer downloads its own Chromium during `npm install`.

### Windows

No extra libraries are needed. Puppeteer downloads its own Chromium during `npm install`.

## Chromium / Chrome browser

On Linux, Puppeteer may not download a browser automatically if the architecture is not supported (e.g., ARM64). In that case, install Chromium from your package manager (shown above) and point Puppeteer to it:

```bash
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
npm install -g @umbrelladocs/linkspector
```

If Puppeteer's bundled download failed, you can also trigger it manually:

```bash
npx puppeteer browsers install chrome
```

## Running as root (containers)

Linkspector now automatically adds the `--no-sandbox` flag when it detects it is running as root (UID 0), which is common in container environments. No manual configuration is needed.

If you still encounter issues, you can also set the flag via an environment variable:

```bash
export PUPPETEER_CHROMIUM_REVISION=0
export PUPPETEER_LAUNCH_ARGS="--no-sandbox"
```

Or use the [Docker image](README.md#docker), which handles all of this out of the box.
