FROM node:18.15
WORKDIR /workspace/hyperSecureLabs
COPY . /workspace/hyperSecureLabs
WORKDIR /workspace/hyperSecureLabs/lab-backend
RUN npm install
RUN npm install -g nodemon
EXPOSE 3000
CMD ["nodemon", "index.js"]