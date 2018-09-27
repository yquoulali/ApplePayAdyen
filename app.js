/*
Copyright (C) 2016 Apple Inc. All Rights Reserved.
See LICENSE.txt for this sample’s licensing information
 
Abstract:
Sets up a simple Express HTTP server to host the example page, and handles requesting 
the Apple Pay merchant session from Apple's servers.
*/

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const https = require("https");
const request = require("request");
//require('request-debug')(request);

/**
* IMPORTANT
* Change these paths to your own SSL and Apple Pay certificates,
* with the appropriate merchant identifier and domain
* See the README for more information.
*/
const APPLE_PAY_CERTIFICATE_PATH = "./certificates/merchant.pem";
const SSL_CERTIFICATE_PATH = "./certificates/cert.cert";
const SSL_KEY_PATH = "./certificates/key.key";
const MERCHANT_IDENTIFIER = "merchant.com.se.fnb.test.xx";
const MERCHANT_DOMAIN = "uat-v3-www.xx.com";

try {
  fs.accessSync(APPLE_PAY_CERTIFICATE_PATH);
  fs.accessSync(SSL_CERTIFICATE_PATH);
  fs.accessSync(SSL_KEY_PATH);
} catch (e) {
  throw new Error('You must generate your SSL and Apple Pay certificates before running this example.');
}

const sslKey = fs.readFileSync(SSL_KEY_PATH);
const sslCert = fs.readFileSync(SSL_CERTIFICATE_PATH);
const applePayCert = fs.readFileSync(APPLE_PAY_CERTIFICATE_PATH);

/**
* Set up our server and static page hosting
*/
const app = express();
app.use(express.static('public'));
app.use(bodyParser.json());


/**
* A POST endpoint to obtain a merchant session for Apple Pay.
* The client provides the URL to call in its body.
* Merchant validation is always carried out server side rather than on
* the client for security reasons.
*/
app.post('/getApplePaySession', function (req, res) {

	// We need a URL from the client to call
	if (!req.body.url) return res.sendStatus(400);

	// We must provide our Apple Pay certificate, merchant ID, domain name, and display name
	const options = {
		url: req.body.url,
		cert: applePayCert,
		key: applePayCert,
		method: 'post',
		body: {
			merchantIdentifier: MERCHANT_IDENTIFIER,
			domainName: MERCHANT_DOMAIN,
			displayName: 'Chanel PB',
		},
		json: true,
	}

	// Send the request to the Apple Pay server and return the response to the client
	request(options, function(err, response, body) {
		if (err) {
			console.log('Error generating Apple Pay session!');
			console.log(err, response, body);
			res.status(500).send(body);
		}
		//console.log(JSON.stringify(body));
		res.send(body);
	});
});
app.post('/log', function (req, res) {
	console.log("message:" + req.body.message);
});
app.post('/doAuth', function (req, res) {
	//console.log("auth:" + JSON.stringify(req.body));
	// 
	//console.log(req.body.token.paymentData.data);
	// We must provide our Apple Pay certificate, merchant ID, domain name, and display name
	const options = {
		url: 'https://pal-test.adyen.com/pal/servlet/Payment/authorise',
		method: 'post',
		body: {
			amount: {value: 1099, currency: 'SEK' },
			reference: '0012600',
			merchantAccount: 'Chanel_SE_ECOM',
			returnUrl: "https://int-v3-www.chanel.com/",
			additionalData:{
			  "payment.token": req.body.token.paymentData
		  }
		},
		auth : {
			user : 'ws_xx@Company.xx',
			pass : 'xxxx'
		},
		json: true,
	}

	// Send the request to the Apple Pay server and return the response to the client
	request(options, function(err, response, body) {
		//console.log('REQUEST RESULTS:', err, res.statusCode, body);
		if (err) {
			console.log('Error generating Apple Pay session!');
			console.log(err, response, body);
			res.status(500).send(body);
		}
		console.log(JSON.stringify(body));
		if(body.resultCode == 'Authorised'){
			console.log("auth: OK");
			res.send(JSON.stringify({success: true}));
		}else{
			console.log("auth: KO");
			res.send(JSON.stringify({success: false}));
		}
		
	});
	
});
/**
* Start serving the app.
*/
https.createServer({
	key: sslKey,
	cert: sslCert,
}, app).listen(4430);
console.log('Server running at https://127.0.0.1:4430/');