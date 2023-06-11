# Secure Consent Model on Blockchain for Sensitive Medical Records
## Motivation, scope and high level design of the project
![Application architecture diagram](https://github.com/enrique-torres/ECE1770_Group4_Project/blob/main/images/architecture_diagram.png)
Access to sensitive medical records is crucial for providing appropriate medical care to patients. However, in the current healthcare system, the sharing of medical records between healthcare providers and third parties (e.g. insurance companies) can be a slow and complicated process that often involves multiple intermediaries. This can result in data breaches, unauthorized access, and medical identity theft. Just last May, there was a data breach at Scarborough Health Network where sensitive patient data such as lab results, personal information and immunization records was accessed unauthorizedly. In a survey conducted by Black Book Market Research LLC in 2019, healthcare providers were identified as the most targeted organizations for industry cybersecurity breaches with over 93% of healthcare organizations having experienced a data breach since Q3 2016 and 57% having more than five data breaches during the same timeframe. \ul{This has led to a growing concern about data privacy and security, as well as the need for efficient and secure methods for sharing medical records.}

In this project, we have developed a secure consent model based on blockchain that will allow patients to control the access and retrieval of their sensitive medical records. By leveraging the distributed nature of blockchain, a secure and transparent system for managing medical records can be created, which eliminates the need for intermediaries and ensures that medical records are secure, private, and accessible only to authorized parties. Patients can provide explicit and informed consent for the sharing of their medical records, and healthcare providers/third parties can access the records only when authorized by the patient. This will ensure that patient data is secure and private, and will also provide a more efficient and cost-effective solution overall.

To achieve this secure consent model, we have developed and deployed the following elements in our application:
 - Deployed a HyperLedger Fabric blockchain system and implemented chaincode in NodeJS to transparently store encrypted medical records alongside access consent information as provided by the patient
 - Developed a secure backend HTTP server that connects the frontend application to the HyperLedger Fabric via NodeJS. The backend is responsible for handling the authentication logic, the patient consent logic, the encryption and decryption logic and the medical record submission and download logic.
 - Finally, we developed an easy to use frontend application based on HTML and JavaScript to allow Lab-produced medical records to be submitted to the secure consent model, allow patients to update their access consent for their medical records, and allow consented accessors to view their patient's medical records in a secure fashion.

## Repository contents
This repository contains the HyperLedger Fabric setup for our project, as well as the chaincode, the implemented backend and the frontend application. The repository is structured as follows:
 - The folder fabric-samples contains example HyperLedger Fabric example chaincodes and applications, as well as our chaincode and business logic in directory named asset-transfer-basic/chaincode-javascript-consensus-project.
 - The folder lab-backend contains the NodeJS backend, which is structured as follows: index.js is the main application script, which opens the HTTP server and also handles all the logic connections between frontend and the HyperLedger Fabric.
 - The frontend application can be viewed in two folders. The main folder is inside the lab-backend folder, under the views folder. This folder contains the dynamic Embedded JavaScript Templates files, which are generated on response time by the backend with all the information that is gathered from both the backend database and the blockchain. The other frontend folder, frontend-raw which can be found on the root of the repository, is the template HTML, CSS and JavaScript code as it was originally designed prior to modifying it with the dynamic template generation.

## Installation of pre-requisites and setup

After cloning the repository certain pre-requisites need to be installed in Ubuntu

### install curl and docker compose
*sudo apt-get install curl*  
*sudo apt-get -y install docker-compose*  

*sudo systemctl start docker*  
*sudo systemctl enable docker*  
*sudo usermod -a -G docker* **user**  

*sudo apt-get update*  

### install golang
*cd ~/Desktop/*  
*curl -O https://dl.google.com/go/go1.18.3.linux-amd64.tar.gz*  
*tar xvf go1.18.3.linux-amd64.tar.gz*  
*export GOPATH=$HOME/go*  
*export PATH=$PATH:$GOPATH/bin*  

### install jq
*sudo snap install jq*  

### install nodeJS version 16
*curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -*  
*sudo apt-get install -y nodejs*  

### test installing node modules for our chaincode assuming the project is in ~/Desktop/hyperledger directory
*cd ~/Desktop/hyperledger/ECE1770_Group4_Project/fabric-samples/asset-transfer-basic/chaincode-javascript-consensus-project/*  
*npm install*  

### ensure all project directories are owned by current user and not root
*cd ~/Desktop*  
*sudo chown -R* **user**:**user** *hyperledger/*  


### bring up the fabric test network with two peer endorsing nodes belonging to different organizations and one ordering node and create private channel channel1 between them
*cd ~/Desktop/hyperledger/ECE1770_Group4_Project/fabric-samples/test-network*  
*./network.sh up createChannel -c channel1 -ca*  

### add bin and config to PATH 
*export FABRIC_CFG_PATH=$PWD/../config/*  
*cd ~/Desktop/hyperledger/ECE1770_Group4_Project/fabric-samples/bin*
*export PATH=${PWD}:$PATH*  

### package chaincode 
*peer lifecycle chaincode package basic.tar.gz --path ~/Desktop/hyperledger/ECE1770_Group4_Project/fabric-samples/asset-transfer-basic/chaincode-javascript-consensus-project/ --lang node --label basic_1.0*  
*. ./scripts/envVar.sh*  

### install chaincode on endorsing node 1
*setGlobals 1*  
*peer lifecycle chaincode install basic.tar.gz*  

### install chaincode on endorsing node 2
*setGlobals 2*  
*peer lifecycle chaincode install basic.tar.gz*  

### query PKGID of installed chaincode
*setGlobals 1*  
*peer lifecycle chaincode queryinstalled --peerAddresses localhost:7051 --tlsRootCertFiles organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt*  

### the PKGID below should match the output you got from previous command this ID is different everytime
*export PKGID=basic_1.0:1aa1cf5818c12a8f35031f98ab18785cb0a0b17174f1ee6af587a6a670a4f761*  

### approve chaincode on node 1
*peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1*  


### approve chaincode on node2
*setGlobals 2*  

*peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --version 1 --package-id $PKGID --sequence 1*  

### commit chaincode
*peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile $PWD/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem --channelID channel1 --name basic --peerAddresses localhost:7051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt --peerAddresses localhost:9051 --tlsRootCertFiles $PWD/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt --version 1 --sequence 1*  

*peer lifecycle chaincode querycommitted --channelID channel1 --name basic --cafile ${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem*  

### Installing the pre-requisites for the backend NodeJS application
Enter the lab-backend directory and run the following command:
*npm install*

## Executing our project and replicating our results
To execute our project, first the Hyperledger Fabric network must be active. Check with systemctl if Docker-Compose is active and once it is, execute the script "initialize_network.sh". This script will bring the network up, initialize the certificates and peers and complete the initialization of the network. Otherwise, follow the above instructions on how to activate the Fabric network.

After the network is running, we need to run the lab backend NodeJS application. To do so, enter the directory lab-backend from this repository and run the following command:
*node index.js*

This will initialize the backend and front-end applications, register the application on the Hyperledger and will initialize a HTTP server on "localhost:3000".
The front-end application can be accessed through several end-points:
- localhost:3000 is the accessors authentication page, and it will redirect the authenticated user to localhost:3000/trackreports/<accessorID>. As an example to test the application, several users are setup in the database for easy login access. One such user has the following credentials: Username: user1, Password: user1
- localhost:3000/submitreport contains the front-end site for medical report file uploading and submission to the blockchain
- localhost:3000/consentupdate/<reportID> allows the patient to modify their access consent for the medical report with report ID <reportID>. Report IDs can be gathered from the backend terminal once a file submission has been completed. Report IDs will have the following example format: hypersecurelabs1681518271

## Performance evaluation results
![Write throughput](https://github.com/enrique-torres/ECE1770_Group4_Project/blob/main/images/write30iters.png)
![Repeated read throughput](https://github.com/enrique-torres/ECE1770_Group4_Project/blob/main/images/repeatread30iters.png)
![Random read throughput](https://github.com/enrique-torres/ECE1770_Group4_Project/blob/main/images/randread30iters.png)

In this section we explain our experimental setup and provide insight into the obtained evaluation results. The experiments for evaluation were setup on a Ubuntu 20.04 LTS virtual machine running in Oracle Virtual Box with dual cores, 4GB RAM and 45 GB of allocated storage. A new HTTP GET API endpoint called /labapi/evaluate was implemented to provide a simple way to iteratively evaluate the application through different experiments. Three different experiments were conducted measuring the throughput of reads and writes of the application by using three different medical record file sizes: 1 KiB, 512 KiB and 1 MiB. Also, before starting the experiment with a particular file size, the existing assets on the blockchain were deleted so that they don't bias the performance over time of each of the different experiments. 

The experiments for the different file sizes are set up in the following manner: For a pre-defined number of iterations (30 in the case of this evaluation), ten write transactions are performed, followed by ten random read transactions (to random record IDs), which are then followed by ten repeated read transactions (to the same record ID). This experimental setup allows us to view and evaluate several things. First, it allows us to see how writes perform overtime when more and more blocks have been committed to the ledger, as in the long run this could and probably will reduce the performance of writing new blocks to the ledger. Second, the reads are done at every iteration after the writes for the same reason, to view the effect of more blocks being committed on the ledger on read throughput. The experiments must be able to observe performance overtime and performance degradation as more blocks are added to the ledger, in both cases of new blocks being added, and blocks being read. Finally, having two different reads experiments (one for random accesses and one for repeated accesses) should allow us to see and compare how our ledger setup performs in the real world, where reads are going to be more frequent than writes.

With this experimental setup in mind, the write throughput was evaluated first. Ten sequential transactions were conducted where for each of the 30 experiment iterations, where ten records with unique record IDs would be created on the ledger. The total time taken for the ten transactions was measured and averaged over them. As shown in the first graph, there is a higher write throughput for 512 KiB files (around 1.2 transactions per second), followed by the write throughput of 1MiB files (average throughput of 0.7 transactions per second), followed by the 1 KiB file maintaining a constant throughput of 0.45 transactions per second. Curiously, the results were somewhat contradictory with the expected results, as the 1KiB file writes would have been expected to achieve a much greater throughput than the 512 KiB and the 1 MiB writes. Further experiments and research showed that these results were produced due to the configuration of our ledger. The ledger was setup by default to batch transactions, which made it wait for either 512 KiB of transactions, or for a timeout of two seconds. This in turn means that our 1 KiB sequential writes never reach the batch size limit, and as such always produce the 2 second timeout. This can be clearly seen in the graph, where the 1 KiB write throughput is the most consistent of the three, always staying at 0.45 transactions per second (or almost one transaction every two seconds).

In the second experiment, the read throughput was evaluated. Similarly to the write throughput experiment, thirty iterations of ten sequential transactions each were used to evaluate the repeated record read throughput of our application. The total time taken for the ten transactions was measured in each iteration, and averaged over all the transactions to calculate the maximum read throughput of our application. As seen in the second graph, the read throughput for 1 KiB file was the highest (around 9 transactions per second), followed by 512 KiB file and the 1 MiB file (both averaging around 4 transactions per second). These results are expected, as the larger the file that the blockchain has to pull, the less read throughput that it will be able to achieve. However, it is interesting to see that there is very little read performance difference between the 512 KiB and 1 MiB file sizes.

The final experiment also evaluated the read throughput in the same way as the repeated read throughput experiment, but in this case for every iteration, ten records with randomized record IDs were read. This experiment allows us to evaluate what the real world performance of our application would be, since most accesses would be performed to random record IDs. The last graph shows the total transactions per second for the three different file sizes. Similarly to the repeated read throughput experiment, the 1KiB reads had the highest throughput, followed by the 512 KiB reads and finally followed by the 1 MiB reads. Surprisingly however, the results do not differ from the repeated reads experiment, which would indicate that our application would be able to perform adequately in real world scenarios.

Finally, to conclude this section, the following table shows the contributions of each of the team's components to the completion of this work. 
| Researcher | Contributions |
|---|---|
| Tahmid Mostafa | Hyperledger Fabric setup, File encoding/decoding and encryption/decryption, general backend implementation, evaluation implementation |
| Aditya Junnarkar | Hyperledger Fabric setup, chaincode implementation, general backend implementation, evaluation implementation |
| Enrique Torres Sanchez | Front-end application development, backend file uploading, general backend implementation, evaluation implementation |

It is left for future work, due to the large scope of the project, the evaluation of a real-world deployment of our application and ledger in a cloud service, across different geographically distributed nodes, to measure the effect of added latency on our performance.
