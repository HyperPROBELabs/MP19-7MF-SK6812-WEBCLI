#!/bin/bash

docker build --no-cache -t mp197mf-sk6812-webcli .

docker run -it --rm -v $(pwd):/work mp197mf-sk6812-webcli make

docker run --rm -i -v $(pwd):/work amake/innosetup setup.iss

