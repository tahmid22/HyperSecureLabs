#!/bin/bash
sudo apt-get install git
sudo apt-get install curl
sudo apt-get -y install docker-compose

sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker $USER

sudo apt-get update

#install golang
cd ~
curl -O https://dl.google.com/go/go1.18.3.linux-amd64.tar.gz
tar xvf go1.18.3.linux-amd64.tar.gz
export GOPATH=$HOME/go
export PATH=$PATH:$GOPATH/bin
echo 'export GOPATH=$HOME/go' >> ~/.bashrc 
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc

#install jq
sudo snap install jq

#download git repo
git clone https://github.com/enrique-torres/ECE1770_Group4_Project
cd ECE1770_Group4_Project/fabric-samples/asset-transfer-basic/chaincode-javascript

#install NodeJS and packages required
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
npm install

#export fabric configs and binary paths
export FABRIC_CFG_PATH=~/ECE1770_Group4_Project/fabric-samples/config/
export FABRIC_BIN_PATH=~/ECE1770_Group4_Project/fabric-samples/bin
export PATH=${FABRIC_BIN_PATH}:$PATH
echo 'export FABRIC_CFG_PATH=~/ECE1770_Group4_Project/fabric-samples/config/' >> ~/.bashrc
echo 'export FABRIC_BIN_PATH=~/ECE1770_Group4_Project/fabric-samples/bin' >> ~/.bashrc
echo 'export PATH=${FABRIC_BIN_PATH}:$PATH' >> ~/.bashrc

# setup ownership of git repo folder
cd ~
sudo chown -R $USER:$USER ~/ECE1770_Group4_Project/

echo "First, restart the machine. Then, to execute the script initialize_network.sh"