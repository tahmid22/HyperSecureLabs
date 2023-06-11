'use strict';

// Basic Web Server imports and global variables
const express = require('express'); // Using the express framework 
require("dotenv").config(); // Get environment variables from .env file(s)
var sqlite3 = require('sqlite3').verbose()
const cors = require('cors');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
const fs = require("fs");
const path = require('path');
const { emitWarning } = require('process');
const AdmZip = require("adm-zip");
// Cookies handling package
var cookieParser = require('cookie-parser');

// Hyperledger imports and gobal variables
const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const { buildCAClient, registerAndEnrollUser, enrollAdmin } = require('../fabric-samples/test-application/javascript/CAUtil.js');
const { buildCCPOrg1, buildWallet } = require('../fabric-samples/test-application/javascript/AppUtil.js');

const channelName = 'channel1';
const chaincodeName = 'basic';
const mspOrg1 = 'Org1MSP';
const walletPath = path.join(__dirname, 'wallet');
const org1UserId = 'appUser';
var gatewayinitialized = false;

// --------------- Encryption Decryption helper functions -------------------------------
const crypto = require('crypto');
const encryptAlgorithm = 'aes-256-ctr'; //Using AES encryption

// Output: b64 encoding of encrypted file content 
const encryptbuffer = (fileBuffer) => {

	console.log('to encrypt');
	const key = Buffer.from(process.env.ENCRYPT_AES_KEY, 'base64');
	// console.log(`The key: ${key}`);
	// Create an initialization vector
	const iv = crypto.randomBytes(16);
	// Create a new cipher using the algorithm, key, and iv
	
	const cipher = crypto.createCipheriv(encryptAlgorithm, key, iv);
	
	// Create the new (encrypted) buffer
	const result = Buffer.concat([iv, cipher.update(fileBuffer), cipher.final()]);
	return result.toString('base64');
};

// Output: b64 encoding of encrypted file content 
const encrypt = (filePath) => {
	const fileBuffer = fs.readFileSync(filePath)

	const key = Buffer.from(process.env.ENCRYPT_AES_KEY, 'base64');
	// console.log(`The key: ${key}`);
	// Create an initialization vector
	const iv = crypto.randomBytes(16);
	
	// Create a new cipher using the algorithm, key, and iv
	const cipher = crypto.createCipheriv(encryptAlgorithm, key, iv);

	// Create the new (encrypted) buffer
	const result = Buffer.concat([iv, cipher.update(fileBuffer), cipher.final()]);
	return result.toString('base64');
};

// This function writes decrypted content to provided filePath
const decrypt = (encryptedB64, outputFilePath) => {
	const key = Buffer.from(process.env.ENCRYPT_AES_KEY, 'base64');
	var encryptedBuf = Buffer.from(encryptedB64, 'base64');

	
 	// Get the iv: the first 16 bytes
 	const iv = encryptedBuf.slice(0, 16);
 	// Get the rest
 	encryptedBuf = encryptedBuf.slice(16);
 	
 	// Create a decipher
 	const decipher = crypto.createDecipheriv(encryptAlgorithm, key, iv);
 	
 	console.log('decrypt');
 	// Actually decrypt it
	
 	const result = Buffer.concat([decipher.update(encryptedBuf), decipher.final()]);
	fs.writeFileSync(outputFilePath, result);
};

// Create a new gateway instance for interacting with the fabric network.
const gateway = new Gateway();
let ccp = null;
let caClient = null;
let wallet = null;

try {
	// build an in memory object with the network configuration (also known as a connection profile)
	ccp = buildCCPOrg1();

	// build an instance of the fabric ca services client based on
	// the information in the network configuration
	caClient = buildCAClient(FabricCAServices, ccp, 'ca.org1.example.com');

} catch (error) {
	console.error(`******** create org: ${error}`);
}

function prettyJSONString(inputString) {
	return JSON.stringify(JSON.parse(inputString), null, 2);
}

//hyperledger functions
async function initializeGateway() {
	try {
		
		// setup the wallet to hold the credentials of the application user
		wallet = await buildWallet(Wallets, walletPath);
	
		// in a real application this would be done on an administrative flow, and only once
		await enrollAdmin(caClient, wallet, mspOrg1);
	
		// in a real application this would be done only when a new user was required to be added
		// and would be part of an administrative flow
		await registerAndEnrollUser(caClient, wallet, mspOrg1, org1UserId, 'org1.department1');
	
			
		try {
			// setup the gateway instance
			// The user will now be able to create connections to the fabric network and be able to
			// submit transactions and query. All transactions submitted by this gateway will be
			// signed by this user using the credentials stored in the wallet.
			await gateway.connect(ccp, {
					wallet,
					identity: org1UserId,
					discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
			});
	
			// Build a network instance based on the channel where the smart contract is deployed
			const network = await gateway.getNetwork(channelName);
	
			// Get the contract from the network.
			const contract = network.getContract(chaincodeName);
			console.log('\n--> Submit Transaction: InitLedger, function creates the initial set of assets on the ledger');
				await contract.submitTransaction('InitLedger');
				console.log('*** Result: committed');
			gatewayinitialized = true;
		} finally {
			// Disconnect from the gateway when the application is closing
			// This will close all connections to the network
			gateway.disconnect();
		}
	} catch (error) {
		console.error(`******** FAILED to initialize hyperledgic gateway: ${error}`);
	}
}

async function getRecordFromLedger(recordid)
{
	let medicalrecordsarray = [];
	try {
		// setup the wallet to hold the credentials of the application user
		//const wallet = await buildWallet(Wallets, walletPath);
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);
		console.log('\n--> Evaluate Transaction: ReadAsset, function returns an asset with a given reportID');
		let result = await contract.evaluateTransaction('ReadAsset', recordid);
		//console.log(`*** Result: ${prettyJSONString(result.toString())}`);	
	    let parsed = JSON.parse(result.toString());
	    //console.log(parsed.MedicalRecords.length);
	    //console.log(parsed.MedicalRecords[0]);
	    medicalrecordsarray = parsed.MedicalRecords.split(',');
	    //console.log(medicalrecordsarray.length);   
	} catch (error) {
		console.error(`******** FAILED to read asset: ${error}`);
	}finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	return medicalrecordsarray;
}

async function getRecordFromLedgerWithAccessorID(accessorID)
{
	let reports = [];
	try {
		// setup the wallet to hold the credentials of the application user
		//const wallet = await buildWallet(Wallets, walletPath);
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);
		console.log('\n--> Evaluate Transaction: ReadAsset, function returns all asset with a given accessorID');
		let result = await contract.evaluateTransaction('GetAllAssetsForSpecificAccessor', accessorID);
		//console.log(`*** Result: ${prettyJSONString(result.toString())}`);
		let parsed = JSON.parse(result.toString());
		//console.log(`length of records + ${parsed.length}`);	
		for (let ind=0; ind < parsed.length; ++ind){
		
			reports.push({ "report_id": parsed[ind].RecordID, "patient_id": "ABC", "report_status": "Pending" });
		}
	
	} catch (error) {
		console.error(`******** FAILED to read assets based on accessor id: ${error}`);
	
	}finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
	return reports;

}

async function updateLedgerWithAccessorID(recordid, accessorid)
{
	try {
		// setup the wallet to hold the credentials of the application user
		//const wallet = await buildWallet(Wallets, walletPath);
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);
		console.log('\n--> Submit Transaction: UpdateAsset recordid, recordid does not exist and should return an error');
	    await contract.submitTransaction('UpdateAssetWithAccessorId', recordid, accessorid);
		console.log('******** updated asset');	
	
	} catch (error) {
		console.error(`******** FAILED to update asset: ${error}`);
	
	}finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
}


async function deleteAllRecordIds()
{
	try {
		// setup the wallet to hold the credentials of the application user
		//const wallet = await buildWallet(Wallets, walletPath);
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);
		console.log('\n--> Submit Transaction: DeleteAllAssets');
	        let result = await contract.submitTransaction('DeleteAllAssets');
		console.log('******** deleted assets');
			
	} catch (error) {
		console.error(`******** FAILED to delete assets: ${error}`);
	}finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
		return 0;
	}
}

async function addLedgerEntry(recordid, accessorid, medicalrecordarray)
{
	try {
		// setup the wallet to hold the credentials of the application user
		//const wallet = await buildWallet(Wallets, walletPath);
		// setup the gateway instance
		// The user will now be able to create connections to the fabric network and be able to
		// submit transactions and query. All transactions submitted by this gateway will be
		// signed by this user using the credentials stored in the wallet.
		await gateway.connect(ccp, {
			wallet,
			identity: org1UserId,
			discovery: { enabled: true, asLocalhost: true } // using asLocalhost as this gateway is using a fabric network deployed locally
		});

		// Build a network instance based on the channel where the smart contract is deployed
		const network = await gateway.getNetwork(channelName);

		// Get the contract from the network.
		const contract = network.getContract(chaincodeName);
		console.log('\n--> Submit Transaction: CreateAsset recordid,  if recordid exists return error');
	    	await contract.submitTransaction('CreateAsset', recordid, accessorid, medicalrecordarray);
		//console.log('******** created asset');	
	
	} 
	catch (error) {
		console.error(`******** FAILED to create asset: ${error}`);
	
	}finally {
		// Disconnect from the gateway when the application is closing
		// This will close all connections to the network
		gateway.disconnect();
	}
}


initializeGateway();
const DBSOURCE = "usersdb.sqlite";

let db = new sqlite3.Database(DBSOURCE, (err) => {
	if (err) {
		// Cannot open database
		console.log("Error opening db. The error is as follows:");
		console.error(err.message)
		throw err
	}
	else {
		var salt = bcrypt.genSaltSync(10);
		//Add a field VisibleName (what will be shown in the update consent html), delete the Email field, delete Date fields
		db.run(`CREATE TABLE Users (
			Id INTEGER PRIMARY KEY AUTOINCREMENT,
			Username text, 
			VisibleName text, 
			Password text,             
			Salt text,    
			Token text
			)`,
			(err) => {
				if (err) {
					// Table already created
				} else {
					// Table just created, creating some rows
					var insert = 'INSERT INTO Users (Username, VisibleName, Password, Salt) VALUES (?,?,?,?)'
					db.run(insert, ["user1", "Dr. Marcus Philippe", bcrypt.hashSync("user1", salt), salt])
					db.run(insert, ["user2", "Dr. Sandra Sanchez", bcrypt.hashSync("user2", salt), salt])
					db.run(insert, ["user3", "NonFungibleTrials S.A.", bcrypt.hashSync("user3", salt), salt])
					db.run(insert, ["user4", "NoPayJose Insurances", bcrypt.hashSync("user4", salt), salt])
					db.run(insert, ["user5", "National Statistical Office", bcrypt.hashSync("user5", salt), salt])
				}
			});
	}
});

// --------------------- GENERAL SERVER FUNCTIONS ---------------------
module.exports = db;
var app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(
	cors({
		origin: 'http://localhost:3000'
	})
);
app.use(cookieParser());

// File uploading imports and global variables
// report ID handling
//var globalReportID = 0;
//var globalFileID = 0;
//fs.stat('last_report_id.txt', function(err, stat) {
//	if (err == null) {
//		const data = fs.readFileSync('last_report_id.txt', 'utf8');
//		globalReportID = parseInt(data);
//	} else if (err.code === 'ENOENT') {
//	  // file does not exist
//	  fs.writeFileSync('last_report_id.txt', "0\n");
//	} else {
//	  console.log('Unrecognized error when opening report ID log: ', err.code);
//	}
//});


const multer = require("multer");
var multerStorage = multer.memoryStorage();
//var multerStorage = multer.diskStorage({
//	destination: function (req, file, cb) {
//		cb(null, 'uploads');
//	},
//	filename: function (req, file, cb) {
//		cb(null, globalReportID + '_' + globalFileID);
//		globalFileID = globalFileID + 1;
//	}
//});
const upload = multer({ 
	storage: multerStorage
	//, fileFilter: function(req, file, callback){
	//	var ext = path.extname(file.originalname);
	//	if(ext !== '.pdf'){
	//	return callback(new Error('Only pdf files are allowed to be uploaded'))
	//	}
	//	callback(null,true)
	//	}		
});


// Code to render dynamic HTML templates
app.set("view engine", "ejs")

app.listen(3000, () => {
	console.log("Server running on port 3000");
});

// Callback to handle JWT token and to validate it
const authenticateJWT = (req, res, next) => {
	var token;
	if ('token' in req.cookies) {
		token = req.body.token || req.query.token || req.headers["x-access-token"] || req.cookies['token'];
	}
	else {
		token = req.body.token || req.query.token || req.headers["x-access-token"]
	}

	if (!token) {
		//var error_message = "A token is required for authentication";
		res.redirect("/" + "?error=1");
		return;
	}
	try {
		const decoded = jwt.verify(token, process.env.TOKEN_KEY);
		req.user = decoded;
		console.log(req.user);
	} catch (err) {
		console.error("Could not validate JWT token. The error:");
		console.error(err);
		//var error_message = "Invalid Token";
		res.redirect("/" + "?error=2");
		return;
	}
	return next();
};
module.exports = authenticateJWT;


// --------------------- REST API RELATED FUNCTIONS ---------------------
app.post("/labapi/login", async (req, res) => {
	try {
		const { username, password } = req.body;
		// Make sure there is an Email and Password in the request
		if (!(username && password)) {
			res.status(400).send("All input is required");
			return;
		}

		let user = [];

		var sql = "SELECT * FROM Users WHERE Username = ?";
		db.all(sql, username, function (err, rows) {
			if (err) {
				//var error_message = "Critical server error";
				console.log(err);
				res.redirect("/" + "?error=3");
				return;
			}

			rows.forEach(function (row) {
				user.push(row);
			})

			if (user.length == 0) {
				//var error_message = "User does not exist";
				console.log("User does not exist");
				res.redirect("/" + "?error=4");
				return;
			}

			var PHash = bcrypt.hashSync(password, user[0].Salt);

			if (PHash === user[0].Password) {
				// * CREATE JWT TOKEN
				const token = jwt.sign({ user_id: user[0].Id, username: user[0].Username }, process.env.TOKEN_KEY,
					{
						expiresIn: "1h", // 60s = 60 seconds - (60m = 60 minutes, 2h = 2 hours, 2d = 2 days)
					}
				);

				user[0].Token = token;

			} else {
				//var error_message = "Password is incorrect";
				console.log("Password is incorrect");
				res.redirect("/" + "?error=5");
				return;
			}

			// redirect to report tracking site
      		//console.log(req.user.Token);
			res.cookie('token', user[0].Token);
			console.log("Logged in user " + user[0].Username + " with token " + user[0].Token);
			res.redirect('/trackreports/' + username);
			return;
		});

	} catch (err) {
		console.log(err);
	}
});

// function to zip together several files
function createZipArchive(folder_to_zip) {
	const zip = new AdmZip();
	const outputFile = "records.zip";
	zip.addLocalFolder(folder_to_zip);
	zip.writeZip(outputFile);
	console.log(`Created ${outputFile} successfully`);
}

app.get("/labapi/getreport/:reportID", authenticateJWT, function (req, res) {
	const reportId = req.params["reportID"];
  // username = req.user.username;
	// REST call to the HF client <-- sample app served on another server
	console.log(`reportID: ${reportId}`);
	getRecordFromLedger(reportId, res)
		.then((medicalrecordsarray) => {
			if(medicalrecordsarray.length == 1){
				let outputfilepath = 'downloads/0';
				console.log(outputfilepath);
				decrypt(medicalrecordsarray[0], outputfilepath);
				res.setHeader('Content-Type', 'application/pdf');
				res.download(outputfilepath, 'medical_report0');
			}
			else {
				for (let i = 0; i < medicalrecordsarray.length; i++) {
					let outputfilepath = 'downloads/0_' + i.toString();
					console.log(outputfilepath);
					decrypt(medicalrecordsarray[i], outputfilepath);
				}
				createZipArchive('downloads');
				res.setHeader('Content-Disposition', 'attachment; filename=records.zip');
				res.setHeader('Content-Type', 'application/zip');
				res.download('records.zip');
				//res.sendFile(outputfilepath + '/download.zip'); //if res.download doesn't work, try this
			}
			// delete all files from downloads folder, including zip
			fs.readdir('downloads', (err, files) => {
				if (err) throw err;
				for (const file of files) {
					fs.unlink(path.join('downloads', file), (err) => {
						if (err) throw err;
					});
				}
			});
	});
	return;
});

app.post("/labapi/submitreport", upload.any(), function(req, res, next){
		const email = req.body.email;
		console.log("Sent e-mail with consent update link to: " + email);
		let num = req.files.length;
		console.log(num+ " files uploaded");
		let index,len;
		let med_record_array = [];
		for(index = 0, len = num; index < len; ++index){

		    let encfile = encryptbuffer(req.files[index].buffer);
		    med_record_array.push(encfile);
		    //console.log(encfile);
		}
		console.log(med_record_array.length);
		let medical_records = med_record_array.join(', ');
		let recordID = "hypersecurelabs"+Date.now();
		console.log(recordID);
		addLedgerEntry(recordID, "", medical_records)
		if (next) {
			console.log("Next function called");
			res.status(200).json({ message: "Successfully Uploaded", status: 200, success: true });
			
			//globalFileID = 0; // reset the file IDs for the next report
			//globalReportID = globalReportID + 1; // increase the global report ID
			//fs.writeFileSync('last_report_id.txt', globalReportID.toString() + "\n");
			return next();
		}
		else {
			//console.log(req.files);
			res.status(200).json({ message: "Successfully Uploaded", status: 200, success: true });
			return;
		}
		});
//	});

app.post("/labapi/consentupdate/:reportID", (req, res) => {
	const reportId = req.params["reportID"];
	const bodyContent = req.body;
	
	
	console.debug("Received consent update for reportID " + reportId);
	// client usernames is an iterable array that contains all the allowed accessor IDs or usernames
	console.debug("Received the following consented clients: " + bodyContent.clientUsernames)
	
	//function below updates ledger with accessor list
	updateLedgerWithAccessorID(reportId, bodyContent.clientUsernames);
	
	//if successful update of ledger, tell the patient that the consent was updated
	res.sendStatus(200);
	return;
});

// --------------------- RENDER RELATED FUNCTIONS ---------------------
// HTML rendering of websites through Embedded JavaScript Templates
app.get("/", (req, res) => {
	var errorCode = parseInt(req.query.error);
	var error = "";
	switch (errorCode) {
		case 1:
			error = "Session expired. Re-login is required";
			break;
		case 2:
			error = "Session error. Contact administrator";
			break;
		case 3:
			error = "Critical server error";
			break;
		case 4:
			error = "User does not exist";
			break;
		case 5:
			error = "Password is incorrect";
			break;
		default:
			break;
	}
	console.log(error);
	res.render("clientlogin", {errorMessage : error});
	return;
});

app.get("/consentupdate/:reportID", (req, res) => {
	const reportID = req.params["reportID"];
	let clientsList = []
	try {
		var sql = "SELECT * FROM Users";
		db.all(sql, function (err, rows) {
			if (err) {
				console.log(err);
				return;
			}

			rows.forEach(function (row) {
				var clientInfo = {"clientUsername": row.Username, "clientVisibleName": row.VisibleName};
				clientsList.push(clientInfo);
			})
			console.log(rows);

			if (clientsList.length == 0) {
				//var error_message = "User does not exist";
				console.log("No clients found in database");
				return;
			}
			res.render("consentupdate", { reportID, clientsList });
		});
	} catch (err) {
		console.log(err);
	}
	return;
});

app.get("/submitreport", (req, res) => {
	res.render("submitreport");
	return;
});

app.get("/success", (req, res) => {
	res.render("successaccessconsent");
	return;
});

// Function that handles rendering of report tracking for the client
app.get("/trackreports/:accessorID", authenticateJWT, (req, res) => {
	// example code to get several track reports dynamically updated


	const accessorID = req.params["accessorID"];
	console.log(`accessor id ${accessorID}`);
	getRecordFromLedgerWithAccessorID(accessorID, res)
		.then((reports => {
			if(reports.length){
				console.log(reports);
				res.render("trackreports", { reports, accessorID });
			}
			else {
				const dummyreports = [{ "report_id": 123, "patient_id": "ABC", "report_status": "Pending" }, { "report_id": 456, "patient_id": "DEF", "report_status": "Ready" }, { "report_id": 789, "patient_id": "GHI", "report_status": "Pending" }, { "report_id": 101112, "patient_id": "ABC", "report_status": "Pending" }];
				res.render("trackreports", { reports, accessorID });
			}
	}));
	//res.render("trackreports", { reports, accessorID });
	return;
});

// --------------------- API TEST FUNCTIONS ---------------------
app.post("/labapi/login/test", authenticateJWT, (req, res) => {
    res.status(200).send('Logged in!');
	return;
});

// --------------------- EVALUATION FUNCTIONS ---------------------
function getRandomRecordID(min, max) {
	return Math.floor(Math.random() * (max - min) + min);
}

async function startEvaluation(){
	const numTimeSeriesIterations = 30;
	const accessorID = "user1";
	const fileSizedPaths = ["evaluation/file_1kb.txt", "evaluation/file_512kb.txt", "evaluation/file_1mb.txt"];
	let nextRecordID = 0;
	try {
		for (let i = 0; i < fileSizedPaths.length; i++) {
			await deleteAllRecordIds();
			var fileContents = fs.readFileSync(fileSizedPaths[i]);
			for (let j = 0; j < numTimeSeriesIterations; j++) {
				// write ten entries
				const startWrite = Date.now();
				await addLedgerEntry(nextRecordID, accessorID, fileContents);
				await  addLedgerEntry((nextRecordID+1).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+2).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+3).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+4).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+5).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+6).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+7).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+8).toString(), accessorID, fileContents);
				await addLedgerEntry((nextRecordID+9).toString(), accessorID, fileContents);

				const endWrite = Date.now();
				const writeTime = endWrite - startWrite;
				
				fs.appendFileSync('evaluation/write_time_series_'+i+'.txt', ''+j+': '+writeTime+'\r\n');
				// read ten random entries from all the entries we have added up to this point
				const startRandomRead = Date.now();
				await  getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
				
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID+9).toString());
				
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
				
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
									
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
									
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
									
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
									
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
									
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID +9).toString());
									
				await getRecordFromLedger(getRandomRecordID(nextRecordID, nextRecordID+9).toString());
				
				const endRandomRead = Date.now();
				const randomReadTime = endRandomRead - startRandomRead;
				fs.appendFileSync('evaluation/random_read_time_series_'+i+'.txt', ''+j+': '+randomReadTime+'\r\n');
				
				// read a specific entry over and over
				const recordToRead = (nextRecordID).toString();
				const startRead = Date.now();
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				await getRecordFromLedger(recordToRead);
				
				const endRead = Date.now();
				const readTime = endRead - startRead;
				
				fs.appendFileSync('evaluation/read_time_series_'+i+'.txt', ''+j+': '+readTime+'\r\n');
				
				nextRecordID = nextRecordID + 10;
				
			}
		}
	} catch(err) {

	} finally {
		await deleteAllRecordIds();
	}
}


app.get("/labapi/evaluate", authenticateJWT, async (req, res) => {
	startEvaluation();
	//deleteAllRecordIds();
});
