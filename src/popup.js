/**
 * Sends message to the content script to search for the hangouts elements and send messages
 */
function sendMessages(messages) {
	if (!messages) {
		return false;
	}

	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {from: 'popup', type: 'SEND_MESSAGES', messages: messages});
	});
	return true;
}

/**
 * formatMessages
 * @param  {string} numbersAndNames   comma separated numbers and names split up with newlines
 * @param  {string} message           message with name piped in like "Hey {name}, this is a test."
 * @return {array}                    False if there are format errors.
 *                                      Otherwise returns an array of message objects like {number: '(123)-456-7890', message: "Hey John, this is a test."}
 */
function formatMessages(numbersAndNames, message) {
	var messages = {};
	var queue = [];
	var errors = '';

	numbersAndNames = numbersAndNames.trim();
	if (!numbersAndNames) {
		showError('No numbers provided.');
		return false;
	}

	var contacts = numbersAndNames.split('\n');
	contacts.forEach(function(contact) {
		var contactDetails = contact.split(',');
		var number = simplifyNumber(contactDetails[0]);
		if (number) {
			var formattedMessage = message.replace("{name}", contactDetails[1] || 'friend');
			messages[number] = formattedMessage;
			queue.push(number);
		} else {
			errors += 'Invalid phone number: ' + contactDetails[0] + '\n';
		}
	});

	if (errors) {
		showError(errors);
		return false;
	}

	return {
		messages,
		queue
	};
}

function showError(error) {
	var numbersAndNamesErrors = document.getElementById('numbers-and-names-errors');
	numbersAndNamesErrors.innerText = error;
}

function clearError() {
	showError('');
}

/**
 * removes all non-numeric characters from the number string
 * @param  {string} number   i.e. (123) 456-7890
 * @return {string}          i.e. 1234567890
 */
function simplifyNumber(number) {
	return number.replace(/\D/g,'');
}

/**
 * uses the chrome tabs API to check if the curren tab is hangouts or inbox
 * @return {[type]} [description]
 */
function currentlyOnSupportedTab(cb) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.sendMessage(tabs[0].id, {from: 'popup', type: 'CHECK_GOOGLE_VOICE_SUPPORT'}, cb);
	});
}

/**
 * configures the appropriate UI listeners for sending messages
 */
function addUIListeners() {
	var sendMessagesButton = document.getElementById('send-messages-button');
	var numbersAndNames = document.getElementById('numbers-and-names');
	var message = document.getElementById('message');

	sendMessagesButton.addEventListener('click', () => {
		clearError();
		var messages = formatMessages(numbersAndNames.value, message.value);
		if (sendMessages(messages)) {
			sendMessagesButton.disabled = true;
		}
	});
}

/**
 * hides the spinner and shows the relevant UI
 * @param  {string} supportLevel 	'GV', 'HANGOUTS', or false
 */
function showUI(supportLevel) {
	if (supportLevel) {
		document.getElementById('ui-wrapper').style.display = 'block';
		if (supportLevel === 'HANGOUTS') {
			var sendMessagesButton = document.getElementById('send-messages-button');
			sendMessagesButton.innerText = 'Prepare Messages';
		}
	} else {
		document.getElementById('wrong-page-message').style.display = 'block';
		document.getElementById('popup-body').style['min-height'] = '275px';
	}

	document.getElementById('loading-screen').style.display = 'none';
}

// configure popup button event listener
document.addEventListener('DOMContentLoaded', () => {
	currentlyOnSupportedTab(function(supportLevel) {
		console.log('support level', supportLevel);
		if (supportLevel !== false) {
			showUI(supportLevel);
			addUIListeners();
		} else {
			showUI(false);
		}
	});
});