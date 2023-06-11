cd ..
docker rm $(docker stop $(docker ps -a -q --filter ancestor=lab_backend/app --format="{{.ID}}"))
cd scripts
docker ps -a