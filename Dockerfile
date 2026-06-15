FROM debian:testing

RUN apt-get update \
 && apt-get install -y --no-install-recommends git make python3 python3-htmlmin python3-csscompressor python3-rjsmin ca-certificates wget curl mingw-w64 mingw-w64-tools mingw-w64-x86-64-dev docker.io\
 && apt-get clean -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /work
RUN /bin/bash
