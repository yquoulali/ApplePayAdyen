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
const PropertiesReader = require('properties-reader');
//require('request-debug')(request);


var properties = PropertiesReader('local.properties');

const env = properties.get('main.env');

const SSL_CERTIFICATE_PATH = properties.get('main.ssl.certificate.path');
const SSL_KEY_PATH = properties.get('main.ssl.key.path');

const APPLE_PAY_CERTIFICATE_PATH = properties.get(env+'.apple.pay.certificate.path');
const MERCHANT_IDENTIFIER =  properties.get(env+'.apple.pay.merchant.identifier');
const MERCHANT_DOMAIN =  properties.get(env+'.apple.pay.merchant.domain');
console.log("Loading env: "+ env);


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
	console.log("auth:" + JSON.stringify(req.body));
	var authorisation = properties.get('adyen.authorisation.active');
	// We must provide our Apple Pay certificate, merchant ID, domain name, and display name
	if(authorisation){
		const options = {
			url: 'https://pal-test.adyen.com/pal/servlet/Payment/authorise',
			method: 'post',
			body: {
				amount: {value: 1099, currency: 'SEK' },
				reference: '0012600',
				merchantAccount: 'Chanel_SE_ECOM',
				returnUrl: "https://uat-v3-www.chanel.com/",
				additionalData:{
				  "payment.token": req.body.token.paymentData
			  }
			},
			auth : {
				user : 'ws_444433@Company.Chanel',
				pass : '2mvZ}rQ*u^btvm#bTH-5rJsQ6'
			},
			json: true,
		}

		// Send the request to the Apple Pay server and return the response to the client
		request(options, function(err, response, body) {
			console.log('REQUEST RESULTS:', err, res.statusCode, body);
			//console.log(JSON.stringify(body));
			if (err) {
				console.log('Error generating Apple Pay session!');
				console.log(err, response, body);
				res.status(500).send(body);
			}
			if(body.resultCode == 'Authorised'){
				console.log("auth: OK");
				res.send(JSON.stringify({success: true}));
			}else{
				console.log("auth: KO");
				res.send(JSON.stringify({success: false}));
			}
			
		});
	}
	
});
/**
* Start serving the app.
*/
https.createServer({
	key: sslKey,
	cert: sslCert,
}, app).listen(4430);
console.log('Server running at https://'+MERCHANT_DOMAIN+':4430/ for merchant '+ MERCHANT_DOMAIN);