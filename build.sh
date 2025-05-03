#! /bin/sh
sudo docker buildx build -t docker.kensa.fr/3d-printer .
sudo docker push docker.kensa.fr/3d-printer