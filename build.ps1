docker build --no-cache -t mp197mf-sk6812-webcli .

docker run -it --rm -v ${PWD}:/work mp197mf-sk6812-webcli make

docker run --rm -i -v ${PWD}:/work amake/innosetup setup.iss
