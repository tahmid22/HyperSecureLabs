cd ..
docker run -p 3000:3000 -d lab_backend/app
cd scripts
docker ps -a