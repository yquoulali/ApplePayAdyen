/*
Copyright (C) 2016 Apple Inc. All Rights Reserved.
See LICENSE.txt for this sample’s licensing information
 
Abstract:
The main client-side JS. Handles displaying the Apple Pay button and requesting a payment.
*/

/**
* This method is called when the page is loaded.
* We use it to show the Apple Pay button as appropriate.
* Here we're using the ApplePaySession.canMakePayments() method,
* which performs a basic hardware check. 
*
* If we wanted more fine-grained control, we could use
* ApplePaySession.canMakePaymentsWithActiveCards() instead.
*/
document.addEventListener('DOMContentLoaded', () => {
	if (window.ApplePaySession) {
		if (ApplePaySession.canMakePayments) {
			showApplePayButton();
		}
	}
});

function showApplePayButton() {
	HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];
	const buttons = document.getElementsByClassName("apple-pay-button");
	for (let button of buttons) {
		button.className += " visible";
	}
}


/**
* Apple Pay Logic
* Our entry point for Apple Pay interactions.
* Triggered when the Apple Pay button is pressed
*/
function applePayButtonClicked() {
	log("supportsVersion 3 ?"+ ApplePaySession.supportsVersion(3));
	const paymentRequest = {
		countryCode: 'SE',
		currencyCode: 'SEK',
		shippingMethods: [
			{
				label: 'Free Shipping',
				amount: '0.00',
				identifier: 'free',
				detail: 'Delivers in five business days',
			},
			{
				label: 'Express Shipping',
				amount: '5.00',
				identifier: 'express',
				detail: 'Delivers in two business days',
			},
			{
				"label": "C&C",
				"detail": "13, avenue CDG, xxx, France",
				"amount": "0.00",
				"identifier": "FreeShip"
			}
		],

		lineItems: [
			{
				label: 'Shipping',
				amount: '0.00',
			}
		],

		total: {
			label: 'Apple Pay Example',
			amount: '10.99',
		},
		shippingContact:{
			"country":"Suède",
			"countryCode":"SE",
			"familyName":"Test1",
			"givenName":"Test1",
			"locality":"Stockholm",
			"postalCode":"11145",
		},

		supportedNetworks:['amex', 'discover', 'masterCard', 'visa'],
		merchantCapabilities: [ 'supports3DS' ],

		requiredBillingContactFields: [ "phone","name", "postalAddress" ],
		requiredShippingContactFields: [ "phone","name", "postalAddress" ],
		shippingType: "delivery"
	};
	const session = new ApplePaySession(3, paymentRequest);
	
	/**
	* Merchant Validation
	* We call our merchant session endpoint, passing the URL to use
	*/
	session.onvalidatemerchant = (event) => {
		const validationURL = event.validationURL;
		getApplePaySession(event.validationURL).then(function(response) {
			log("Validate merchant");
  			//log(JSON.stringify(response));
  			session.completeMerchantValidation(response);
		});
	};

	/**
	* Shipping Method Selection
	* If the user changes their chosen shipping method we need to recalculate
	* the total price. We can use the shipping method identifier to determine
	* which method was selected.
	*/
	session.onshippingmethodselected = (event) => {
		//log("onshippingmethodselected: " + JSON.stringify(event.shippingMethod));
		const shippingCost = event.shippingMethod.identifier === 'free' ? '0.00' : '5.00';
		const totalCost = event.shippingMethod.identifier === 'free' ? '8.99' : '13.99';

		const lineItems = [
			{
				label: 'Shipping',
				amount: shippingCost,
			},
		];

		const total = {
			label: 'Apple Pay Example',
			amount: totalCost,
		};
		
		session.completeShippingMethodSelection(ApplePaySession.STATUS_SUCCESS, total, lineItems);
	
		
	};
	
	session.onshippingcontactselected = function onshippingcontactselected(event) {
        //onshippingcontactselectedCount += 1;
        var shippingContact = event.shippingContact;
        log('Shipping contact was selected: \n' + JSON.stringify(shippingContact, undefined, 4) + '\n');

		const lineItems = [
			{
				label: 'Shipping',
				amount: '2.00',
			},
		];

		const total = {
			label: 'Apple Pay Example',
			amount: '10.01',
		};
        // make sure we use new items if it exists
        var update = {
			errors: [],
            newTotal: total,
            newLineItems: lineItems
        };
       

        session.completeShippingContactSelection(update);
    };
	
	/**
	* Payment Authorization
	* Here you receive the encrypted payment data. You would then send it
	* on to your payment provider for processing, and return an appropriate
	* status in session.completePayment()
	*/
	session.onpaymentauthorized = (event) => {
		// Send payment for processing...
		const payment = event.payment;

		//log(JSON.stringify(payment));
		
		doAuth(JSON.stringify(payment)).then( function(response) {
			log("authorisation: " + JSON.stringify(response));
			if(response.success){
				session.completePayment(ApplePaySession.STATUS_SUCCESS);
				window.location.href = "/success.html";
			}else{
				session.completePayment(ApplePaySession.STATUS_SUCCESS);
				window.location.href = "/fraude.html";
			}
		});
	};

	// All our handlers are setup - start the Apple Pay payment
	session.begin();
}
