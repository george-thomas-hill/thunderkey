// © 2021 Sarah Forest and George Hill
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

////////////////////////////////////////////////////////////////////////////////

// The following file was adapted from the "messageDisplayScript" sample
// Thunderbird extension provided here:
// https://github.com/thundernest/sample-extensions

////////////////////////////////////////////////////////////////////////////////

// Set up a listener for commands coming from background.js:
// Adapted from: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
browser.runtime.onMessage.addListener(request => {
    const command = request.command;
    switch (command) {
        case "scroll-up":
            document.body.scrollTop = document.body.scrollTop - 100;
            return Promise.resolve({ response: "Success!" });
            break;
        case "scroll-down":
            document.body.scrollTop = document.body.scrollTop + 100;
            return Promise.resolve({ response: "Success!" });
            break;
        default:
            break;
    }
    return Promise.resolve({ response: "Unknown command!" });
});

////////////////////////////////////////////////////////////////////////////////

/*

// Right now, none of this commented-out code is needed. It is being left here
// only as an example to follow for future development.

const injectElement = async () => {
    // Create the injected element itself:
    const injectedElement = document.createElement("div");
    injectedElement.className = "injected-element";

    // Create buttons to trigger scrolling:
    const scrollUp = document.createElement("button");
    scrollUp.innerText = "Scroll up";
    scrollUp.addEventListener("click", async () => {
        // This is how to send a command to the background script:
        // browser.runtime.sendMessage({
        //     command: "markUnread",
        // });

        // This is what we are actually here to do:
        document.body.scrollTop = document.body.scrollTop - 100;
    });
    const scrollDown = document.createElement("button");
    scrollDown.innerText = "Scroll down";
    scrollDown.addEventListener("click", async () => {
        // This is what we are actually here to do:
        document.body.scrollTop = document.body.scrollTop + 100;
    });

    // Add buttons to the injectedElement:
    injectedElement.appendChild(scrollUp);
    injectedElement.appendChild(scrollDown);

    // Insert the injectedElement as the very first element in the message:
    document.body.insertBefore(injectedElement, document.body.firstChild);
};

injectElement();

*/
