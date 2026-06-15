@echo off
setlocal

docker build --no-cache -t mp197mf-sk6812-webcli .

docker run -it --rm -v %cd%:/work mp197mf-sk6812-webcli make

docker run --rm -i -v %cd%:/work amake/innosetup setup.iss

endlocal
