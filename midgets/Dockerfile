# Midget POC — minimal Linux agent sandbox
# Proves: Xvfb + xdotool + Python wrapper = steer-equivalent on Linux
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV SCREEN_WIDTH=1280
ENV SCREEN_HEIGHT=720
ENV SCREEN_DEPTH=24

# One apt layer — everything the midget needs to see and click
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb \
    fluxbox \
    xdotool \
    scrot \
    xclip \
    wmctrl \
    x11-utils \
    xterm \
    xfonts-base \
    fonts-dejavu-core \
    tmux \
    tesseract-ocr \
    x11vnc \
    wget \
    python3 \
    python3-pip \
    python3-venv \
    python3-yaml \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS + agent CLIs — multi-model agent framework
# Debian apt ships Node 18 which is EOL and breaks Gemini CLI (needs v regex flag from Node 20+).
# NodeSource provides current LTS.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && npm install -g \
        @anthropic-ai/claude-code \
        @openai/codex \
        @google/gemini-cli \
        @mariozechner/pi-coding-agent \
        opencode-ai \
    && rm -rf /var/lib/apt/lists/* /root/.npm

# Google Chrome (stable) — Chromium via Google's apt .deb
# --no-sandbox required in containers; --disable-dev-shm-usage avoids /dev/shm limits
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
        -O /tmp/chrome.deb \
    && apt-get update \
    && apt-get install -y /tmp/chrome.deb \
    && rm -rf /tmp/chrome.deb /var/lib/apt/lists/*

# Steer wrapper
COPY steer/ /opt/steer/
COPY entrypoint.sh /opt/entrypoint.sh
COPY tests/test-poc.sh /opt/test-poc.sh
COPY tests/test-drive.sh /opt/test-drive.sh
COPY tests/test-ocr.sh /opt/test-ocr.sh
COPY tests/test-chromium.sh /opt/test-chromium.sh
COPY tests/test-agent.sh /opt/test-agent.sh
COPY tests/test-jobs.sh /opt/test-jobs.sh
# Neuter fbsetbg - fluxbox calls it on startup to set wallpaper,
# but no wallpaper setter is installed, causing an xmessage popup.
RUN printf '#!/bin/sh\nexit 0\n' > /usr/bin/fbsetbg

RUN chmod +x /opt/entrypoint.sh /opt/steer/steer /opt/steer/drive \
        /opt/steer/jobrunner /opt/steer/steer-watcher \
        /opt/test-poc.sh /opt/test-drive.sh /opt/test-ocr.sh \
        /opt/test-chromium.sh /opt/test-agent.sh /opt/test-jobs.sh

# Non-root agent user
RUN useradd -m -s /bin/bash agent
USER agent
WORKDIR /home/agent

ENTRYPOINT ["/opt/entrypoint.sh"]
