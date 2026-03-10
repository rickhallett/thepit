# Midget POC — minimal Linux agent sandbox
# Proves: Xvfb + xdotool + Python wrapper = steer-equivalent on Linux
FROM ubuntu:24.04

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
    tmux \
    tesseract-ocr \
    python3 \
    python3-pip \
    python3-venv \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Steer wrapper
COPY steer/ /opt/steer/
COPY entrypoint.sh /opt/entrypoint.sh
COPY test-poc.sh /opt/test-poc.sh
COPY test-drive.sh /opt/test-drive.sh
COPY test-ocr.sh /opt/test-ocr.sh
RUN chmod +x /opt/entrypoint.sh /opt/steer/steer /opt/steer/drive /opt/test-poc.sh /opt/test-drive.sh /opt/test-ocr.sh

# Non-root agent user
RUN useradd -m -s /bin/bash agent
USER agent
WORKDIR /home/agent

ENTRYPOINT ["/opt/entrypoint.sh"]
