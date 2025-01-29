#!/bin/sh
set -e

echo '::group::🔗💀 Setting up Chrome Linux Sandbox'
# Based on the instructions found here: https://chromium.googlesource.com/chromium/src/+/main/docs/security/apparmor-userns-restrictions.md
if [ "$(lsb_release -rs)" = "24.04" ]; then
  echo 0 | sudo tee /proc/sys/kernel/apparmor_restrict_unprivileged_userns
  echo 'Done'
fi
echo '::endgroup::'

echo '::group::🔗💀 Installing NPM packages'
npm ci
echo '::endgroup::'

echo '::group::🔗💀 Running tests'
npm run test
echo '::endgroup::'
