#!/bin/bash

docker build --no-cache -t mp197mf-sk6812-webcli .

docker run --rm -i -v $(pwd):/work mp197mf-sk6812-webcli make

docker container create --name setup amake/innosetup setup.iss
docker cp ./hpevbsrv.exe setup:/work/
docker cp ./setup.iss setup:/work/
docker cp ./LICENSE.md setup:/work/
docker cp ./icon.ico setup:/work/
docker start -i -a setup
mkdir -p ./Output
docker cp setup:/work/Output/. ./Output/
docker rm setup
