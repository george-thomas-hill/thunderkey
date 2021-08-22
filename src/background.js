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

// Set a constant that can be used throughout this file.

const thisIsAMac = navigator.platform.indexOf("Mac") !== -1;

////////////////////////////////////////////////////////////////////////////////

// Use the startup phase to tell Thunderbird that it should inject
// our message-content-script.js file whenever a message is displayed.

// Right now, message-content-script.js is used only for scroll-up and
// scroll-down.

// Right now, message-content-script.css is not used at all.

const handleStartup = () => {
    messenger.messageDisplayScripts.register({
        js: [{
            file: "/src/message-content-script/message-content-script.js"
        }],
        css: [{
            file: "/src/message-content-script/message-content-styles.css"
        }],
    });
};

// Execute the startup handler whenever Thunderbird starts.
document.addEventListener("DOMContentLoaded", handleStartup);

////////////////////////////////////////////////////////////////////////////////

// Open the onboarding page upon installation.

browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
    // if (temporary) return; // Skip during development.

    switch (reason) {
        case "install":
            {
                const url =
                    browser.runtime.getURL("src/onboarding/onboarding.html");
                await browser.tabs.create({ url });
                // Alternatively:
                // await browser.windows.create({
                //     url,
                //     type: "popup",
                //     height: 600,
                //     width: 600,
                // });
            }
            break;
    }
});

////////////////////////////////////////////////////////////////////////////////

// Listen for uncaught keydowns that happen in any window at any time.

// We do this using thunderkey_api, a WebExtension Experiment.
// https://thunderbird-webextensions.readthedocs.io/en/78/how-to/experiments.html

// thunderkey_api.onAnyKeydown.addListener() takes a function that receives two
// parameters: a string representing the pressed key, and a string reporting
// the "view" in which the key was pressed.

browser.thunderkey_api.onAnyKeydown.addListener(keydownHandler);

async function keydownHandler(pressedKey, view) {
    // Get experimentalShortcutsPreferences from thunderkey_api.
    const experimentalShortcutsPreferences =
        await getExperimentalShortcutsPreferences();

    const subKey = thisIsAMac ? "shortcutMac" : "shortcut";

    // Iterate over all existing commands and see if the shortcut specified
    // in experimentalShortcutsPreferences matches the key combination that was
    // just pressed.
    let command = null;
    for (const commandString of Object.keys(experimentalShortcutsPreferences)) {
        if (
            experimentalShortcutsPreferences[commandString][subKey] ===
            pressedKey
        ) {
            command = commandString;
            break;
        }
    }

    // If command === null, we didn't find a match.
    if (command === null) return;

    // Otherwise, we should act on the command that we found.
    actOnCommand({ command, view });
}

////////////////////////////////////////////////////////////////////////////////

// Listen for commands fired by the WebExtension commands API.
// https://thunderbird-webextensions.readthedocs.io/en/78/commands.html

// No longer used.
/*
browser.commands.onCommand.addListener((command) => {
    // We have deactivated all commands from the WebExtension commands API,
    // so this code should never get called.
    console.log("Something unexpected happened.");
    const view = undefined;
    actOnCommand({ command, view });
});
*/

////////////////////////////////////////////////////////////////////////////////

// Act on commands, whether fired by thunderkey_api keydowns or by the
// WebExtension commands API.

// We pass those commands the "view" so that the command can decide what
// action to take.

async function actOnCommand({ command, view }) {
    // See if the command is a "selectFolder-" or "moveToFolder-" command.
    const selectAndMoveSearchStrings = [
        "selectFolder",
        "moveToFolder"
    ];
    for (const searchString of selectAndMoveSearchStrings) {
        if (command.slice(0, searchString.length) === searchString) {
            const folderNumber = command.split("-")[1] - 1;
            selectFolderOrMoveMessages({
                commandString: searchString,
                folderNumber,
                view,
            });
            return;
        }
    }

    // If not, see if it is some other command.
    switch (command) {
        case "scroll-up":
            await scrollUpOrDown({ command, view });
            break;
        case "scroll-down":
            await scrollUpOrDown({ command, view });
            break;
        case "mailbox-up":
            mailboxUpDown("up", view);
            break;
        case "mailbox-down":
            mailboxUpDown("down", view);
            break;
        case "add-folder":
            addFolder();
            break;
        case "move-sent-message":
            moveSentMessage();
            break;
        default:
            console.log(`Unhandled command: ${command}`)
            break;
    }
}

////////////////////////////////////////////////////////////////////////////////

// These functions define the commands available through our thunderkey_api
// Experiment, as opposed to those available through the WebExtension commands
// API.

// Commands available through the WebExtension commands API are defined in
// manifest.json.

const defaultExperimentalShortcutsPreferencesObject = {
    "scroll-up": {
        description: "Scroll the current message up",
        shortcut: "Ctrl+ArrowLeft",
        shortcutMac: "Meta+ArrowLeft",
    },
    "scroll-down": {
        description: "Scroll the current message down",
        shortcut: "Ctrl+ArrowRight",
        shortcutMac: "Meta+ArrowRight",
    },
    "mailbox-up": {
        description: "Move up to the previous folder",
        shortcut: "Alt+ArrowUp",
        shortcutMac: "Meta+g",
    },
    "mailbox-down": {
        description: "Move down to the next folder",
        shortcut: "Alt+ArrowDown",
        shortcutMac: "Meta+b",
    },
    "add-folder": {
        description: "Add a folder",
        shortcut: "Ctrl+t",
        shortcutMac: "Meta+t",
    },
    "move-sent-message": {
        description: "Move most recently sent message to folder",
        shortcut: "Alt+f",
        shortcutMac: "Meta+w",
    },
    "selectFolder-1": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-1": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-2": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-2": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-3": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-3": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-4": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-4": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-5": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-5": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-6": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-6": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-7": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-7": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-8": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-8": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-9": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-9": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-10": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-10": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-11": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-11": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-12": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-12": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-13": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-13": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-14": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-14": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-15": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-15": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-16": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-16": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-17": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-17": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-18": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-18": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-19": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-19": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "selectFolder-20": {
        description: "Select the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
    "moveToFolder-20": {
        description: "Move the selected messages to the designated folder",
        shortcut: "Disabled",
        shortcutMac: "Disabled",
    },
};

function getDefaultExperimentalShortcutsPreferencesObject() {
    return defaultExperimentalShortcutsPreferencesObject;
}

// Provide current experimental shortcut preferences, reverting to default if
// necessary.
async function getExperimentalShortcutsPreferences() {
    // Get defaultExperimentalShortcutsPreferencesObject.
    const defaultExperimentalShortcutsPreferencesObject =
        getDefaultExperimentalShortcutsPreferencesObject();

    // Get experimentalShortcutsPreferences from the WebExtension API.
    const experimentalShortcutsPreferences =
        await browser.storage.local.get("experimentalShortcutsPreferences");
    const experimentalShortcutsPreferencesObject =
        experimentalShortcutsPreferences.experimentalShortcutsPreferences || {};

    // Generate actualExperimentalShortcuts.
    let actualExperimentalShortcutsPreferences = {};
    let needToUpdatePreferences = false;
    // Iterate over the commands encoded in
    // defaultExperimentalShortcutsPreferencesObject:
    for (
        const command
        of Object.keys(defaultExperimentalShortcutsPreferencesObject)
    ) {
        // If we have already set preferences for it, use those preferences;
        // otherwise, use the defaults.
        if (experimentalShortcutsPreferencesObject[command]) {
            actualExperimentalShortcutsPreferences[command] = {
                ...experimentalShortcutsPreferencesObject[command]
            };
        } else {
            actualExperimentalShortcutsPreferences[command] = {
                ...defaultExperimentalShortcutsPreferencesObject[command]
            };
            needToUpdatePreferences = true;
        }
    }

    // Store the updated preferences in synced storage if necessary.
    if (needToUpdatePreferences) {
        await browser.storage.local.set({
            experimentalShortcutsPreferences:
                actualExperimentalShortcutsPreferences,
        });
    }

    return actualExperimentalShortcutsPreferences;
}

////////////////////////////////////////////////////////////////////////////////

// These helper functions are used by other functions here in background.js.

// Function provided here:
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
function onError(error) {
    console.error(`Error: ${error}`);
}

// Adapted from function provided here:
// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/sendMessage
function sendMessageToTabs(tabs, command) {
    for (let tab of tabs) {
        browser.tabs.sendMessage(
            tab.id,
            { command: command }
        )
            .then(response => {
                // console.log("Message from the content script:");
                // console.log(response.response);
            })
            .catch(onError);
    }
}

async function getWhetherThisIsAThreePaneWindow({ view }) {
    // Return false if we are in an editing window:
    if (
        view === "about:blank?compose" ||
        view ===
        "chrome://messenger/content/messengercompose/messengercompose.xhtml"
    ) return false;

    // Check to see if our currently focused window might be a message window:
    const getInfoObject = {
        populate: true,
    };
    const allWindows = await browser.windows.getAll(getInfoObject);

    const focusedWindows = allWindows.filter(window => window.focused === true);
    const focusedWindow = focusedWindows[0];

    const focusedWindowTabs = focusedWindow.tabs;
    const focusedWindowTab = focusedWindowTabs[0];

    // GH: 2021-07-14:
    // If focusedWindowTab.mailTab === false, then we are in a message window.
    //
    // Try as I might, I can't get message window tabs to work with
    // browser.tabs.sendMessage(). When I use the tabId number of a message
    // window's tab, I get the following error:
    // "node.getAttribute is not a function" from "ExtensionParent.jsm".
    //
    // For now, the best that I can do is have this extension decline to send
    // its "scroll-up" or "scroll-down" message if we are in a message window
    // (where we can use the up and down arrow keys instead).
    if (focusedWindowTab.mailTab === false) {
        return false; // We are (probably) in a message window.
    } else {
        return true; // We are in a three-pane Thunderbird main window.
    }
}

////////////////////////////////////////////////////////////////////////////////

// Implement "scroll-up" and "scroll-down" commands.

async function scrollUpOrDown({ command, view }) {
    // See comments in getWhetherThisIsAThreePaneWindow().
    const thisIsAThreePaneWindow =
        await getWhetherThisIsAThreePaneWindow({ view });

    if (thisIsAThreePaneWindow) {
        // We are in a three-pane Thunderbird main window.
        const activeTabArray =
            await browser.tabs.query({ currentWindow: true, active: true });
        // browser.tab.sendMessage() does work with the tabs in this array.
        sendMessageToTabs(activeTabArray, command);
    }
}

////////////////////////////////////////////////////////////////////////////////

// Implement "mailbox-up" and "mailbox-down" commands.

// Flatten folder, navigate up or down, and set new active folder in UI.
async function mailboxUpDown(action, view) {
    if (view !== "chrome://messenger/content/messenger.xhtml") return;

    let accountsArray = await browser.accounts.list();
    await sortAccountsAndFolders(accountsArray);
    let currentTab = await browser.mailTabs.query({
        currentWindow: true,
        active: true
    });

    var nodeArr = [];
    accountsArray.forEach(account => {
        nodeArr = nodeArr.concat(recursivelyGetFolderList(account.folders));
    });

    var currentIndex = findNode(currentTab[0].displayedFolder, nodeArr);

    if (action == 'up') {
        --currentIndex;
    } else {
        ++currentIndex;
    }

    if (currentIndex < 0) {
        currentIndex = 0;
    } else if (currentIndex >= nodeArr.length) {
        currentIndex = nodeArr.length - 1;
    }

    var displayedFolder = {
        accountId: nodeArr[currentIndex].accountId,
        name: nodeArr[currentIndex].name,
        path: nodeArr[currentIndex].path,
    }

    await browser.mailTabs.update(currentTab[0].id, {
        displayedFolder: displayedFolder,
    });
}

// Determine which account list folders to traverse.
function findAccountArray(id, array) {
    for (const node of array) {
        if (node.id === id) return node;
    }
}

// Return the current index of the selected folder for up or down.
function findNode(obj, array) {
    var indexItemPrior = null;
    array.forEach((element, index) => {
        if (checkEqual(element, obj)) indexItemPrior = index;
    });
    return indexItemPrior;
}

// Find equality based on name and path.
function checkEqual(object1, object2) {
    return (
        object1['accountId'] == object2['accountId'] &&
        object1['name'] == object2['name'] &&
        object1['path'] == object2['path']
    )
}

//Flatten the array with recursion to identify subfolders.
function recursivelyGetFolderList(folders) {
    return folders.reduce(function (result, next) {
        result.push(next);
        if (next.subFolders) {
            result = result.concat(recursivelyGetFolderList(next.subFolders));
            next.items = [];
        }
        return result;
    }, []);
}

////////////////////////////////////////////////////////////////////////////////

// Implement "add-folder" command.

async function addFolder() {
    browser.windows.create({
        url: "/src/add-folder/add-folder.html",
        type: "panel",
        width: 700,
        height: 700,
    })
        .then((response) => { /* console.log(response) */ })
        .catch(onError);
}

// This function is used to populate the folder and accounts list in popup.html
// form.
async function getAccounts() {
    return await browser.accounts.list();
}

// Create the folder at the specified location and close popup and refresh mail
// tab so that the user can easily see the changes were made.
function createNewFolder(windowId, accountName, path, folderName) {
    browser.folders.create({
        accountId: accountName,
        path: path
    },
        folderName
    ).then((response) => {
        browser.windows.remove(windowId).then(() => {
            // Make sure that the changes display to user on submit action.
            browser.mailTabs.query({
                active: true,
                currentWindow: true
            }).then(mailWindow => {
                var updateProperties = {
                    displayedFolder: response,
                    folderPaneVisible: mailWindow[0].folderPaneVisibile,
                    layout: mailWindow[0].layout,
                    messagePaneVisible: mailWindow[0].messagePaneVisible,
                    sortOrder: mailWindow[0].sortOrder,
                    sortType: mailWindow[0].sortType
                };
                browser.mailTabs.update(mailWindow.id, updateProperties)
                    .then(() => { });
            })
        })
    });
}

////////////////////////////////////////////////////////////////////////////////

// Implement "move-sent-message" command.

var shouldMoveSent = false;

async function moveSentMessage() {
    // Need to add a new popup here to get user-specified new folder to move to.
    browser.windows.create({
        url: "/src/move-sent/sent.html",
        type: "panel",
        width: 700,
        height: 700,
    })
        .then((response) => { /* console.log(response) */ })
        .catch(onError);
}

// https://webextension-api.thunderbird.net/en/78/how-to/messageLists.html
async function getMostRecentMessage(folder) {
    folder = {
        accountId: folder.accountId,
        name: folder.name,
        path: folder.path
    };

    let page = await messenger.messages.query({
        folder: folder,
        fromDate: new Date(Date.now() - 86400000)
    });

    var message = { id: 0 };
    if (page && page.messages.length > 0) {
        for (i = 0; i < page.messages.length; i++) {
            if (page.messages[i].id > message.id) {
                message = page.messages[i];
            }
        }
    }
    return message;
}

async function moveMessageToSpecifiedFolder(
    windowId,
    accountName,
    folder,
    messageDetails
) {
    browser.messages.move(
        [messageDetails.id],
        {
            accountId: accountName,
            path: folder
        }).then(() => {
            browser.windows.remove(windowId).then(() => {
                // Make sure that the changes display to the user on submit.
                browser.mailTabs.query({
                    active: true,
                    currentWindow: true
                }).then(mailWindow => {
                    var updateProperties = {
                        displayedFolder: mailWindow[0].displayedFolder,
                        folderPaneVisible: mailWindow[0].folderPaneVisibile,
                        layout: mailWindow[0].layout,
                        messagePaneVisible: mailWindow[0].messagePaneVisible,
                        sortOrder: mailWindow[0].sortOrder,
                        sortType: mailWindow[0].sortType
                    };
                    browser.mailTabs.update(mailWindow.id, updateProperties)
                        .then(() => { });
                })
            })
        });
}

////////////////////////////////////////////////////////////////////////////////

// Implement "selectFolder-" and "moveToFolder-" commands.

async function selectFolderOrMoveMessages(parametersObject) {
    const { commandString, folderNumber, view } = parametersObject;

    // First check to see if we are in a three-pain main Thunderbird window.
    const thisIsAThreePaneWindow =
        await getWhetherThisIsAThreePaneWindow({ view });
    if (thisIsAThreePaneWindow === false) {
        return; // If this is not a three-pane window, do nothing.
    }

    // Otherwise, we know the folderNumber, but we need to look up which folder
    // that number refers to.
    const folderPreferences =
        await browser.storage.local.get("folderPreferences");
    const folderPreferencesArray = folderPreferences.folderPreferences;

    let targetFolderObject = folderPreferencesArray[folderNumber];
    const accountName = targetFolderObject.accountName;
    const folderPath = targetFolderObject.folderPath;

    if (accountName === "" || folderPath === "") {
        console.log(
            `Command ${commandString}-${folderNumber + 1} was fired with an ` +
            `undefined destination folder.`
        )
        return;
    }

    // Get accountsArray from the WebExtension API.
    const accountsArray = await browser.accounts.list();

    // Find the account that matches the account of the folder in question.
    const targetAccountArray = accountsArray.filter(
        account => account.name === accountName
    );
    if (targetAccountArray.length !== 1) {
        console.log(
            `Command ${commandString}-${folderNumber + 1} was fired with a ` +
            `destination account that doesn't match any existing account.`
        )
        return;
    }
    const targetAccountId = targetAccountArray[0].id;

    // Create an object in the format required by the WebExtensions API.
    const destinationFolder = {
        accountId: targetAccountId,
        path: folderPath,
    }

    // Now actually do the necessesary work.
    if (commandString === "selectFolder") {
        browser.mailTabs.update({
            displayedFolder: destinationFolder,
        });
    } else {
        // commmandString must be "moveToFolder".

        // Get the selected messages.
        const selectedMessages = await browser.mailTabs.getSelectedMessages();
        const selectedMessagesArray = selectedMessages.messages;

        // Make an array containing just the message IDs.
        let messageIdArray = [];
        for (const message of selectedMessagesArray) {
            messageIdArray.push(message.id);
        }

        // Actually do the work.
        browser.messages.move(messageIdArray, destinationFolder);
    }
}

////////////////////////////////////////////////////////////////////////////////

// sortAccountsAndFolders is a helper function used throughout this extension
// to sort folders into the same sequence in which they appear in the main
// Thunderbird window.

async function sortAccountsAndFolders(accountsArray) {
    // Get preferences set by the "Manually sort folders" extension, if it is
    // installed.
    const manuallySortFoldersSortOrderData =
        await browser.thunderkey_api.getManuallySortFoldersSortOrderData();

    // Iterate over each account and sort its folders.
    for (const accountIndex of Object.keys(accountsArray)) {
        sortFoldersRecursively({
            foldersArray: accountsArray[accountIndex].folders,
            accountObject: accountsArray[accountIndex],
            manuallySortFoldersSortOrderData,
        });
    }
}

// This is the function that sorts the folders. The function is small because
// the hard part is done by getFolderComparisonFunction().
function sortFoldersRecursively(parametersObject) {
    let {
        foldersArray,
        accountObject,
        manuallySortFoldersSortOrderData,
    } = parametersObject;

    // Actually sort the folders.
    foldersArray.sort(
        getFolderComparisonFunction({
            accountObject,
            manuallySortFoldersSortOrderData,
        })
    );

    // See if any of the folders have subfolders and act accordingly.
    for (let folder of foldersArray) {
        if (folder.subFolders && folder.subFolders.length > 0) {
            sortFoldersRecursively({
                foldersArray: folder.subFolders,
                accountObject,
                manuallySortFoldersSortOrderData,
            });
        }
    }
}

// This function returns the comparison function used by
// sortFoldersRecursively().
function getFolderComparisonFunction(parametersObject) {
    const {
        accountObject,
        manuallySortFoldersSortOrderData
    } = parametersObject;

    const currentAccountName = accountObject.name;

    const manuallySortFoldersSortOrderDataForCurrentAccount =
        manuallySortFoldersSortOrderData[currentAccountName] || [];

    let manuallySortFoldersSortOrderDataObject = {};
    if (manuallySortFoldersSortOrderDataForCurrentAccount[1]) {
        manuallySortFoldersSortOrderDataObject =
            manuallySortFoldersSortOrderDataForCurrentAccount[1];
    }

    let sortOrder = "thunderbird-default";
    if (
        manuallySortFoldersSortOrderData[currentAccountName] !== undefined &&
        manuallySortFoldersSortOrderData[currentAccountName][0] !== "0"
    ) {
        // If we get here, we have "Manually sort folders" installed, and we
        // have told it to override Thunderbird's default sort order.
        if (manuallySortFoldersSortOrderData[currentAccountName][0] === "1") {
            // If we get here, we have told "Msf" to sort by strict alphabetical
            // order.
            sortOrder = "alphabetical";
        } else {
            // manuallySortFoldersSortOrderData[currentAccountName][0] must
            // equal "2", so we'll sort by its custom sequence.
            sortOrder = "manually-sort-folders-sequence";
        }
    }

    // We need to return a function in the form expected by
    // Array.prototype.sort().
    return function (folderObjectA, folderObjectB) {
        switch (sortOrder) {
            case "thunderbird-default":
                // The function needs to return a value; this is where we
                // calculate that value, if we're sorting by Thunderbird's
                // default sort order.
                return compareByThunderbirdDefault({
                    folderObjectA,
                    folderObjectB,
                });
                break;
            case "alphabetical":
                // This is where we calculate the value if we are sorting
                // alphabetically.
                return compareAlphabetically({ folderObjectA, folderObjectB });
                break;
            case "manually-sort-folders-sequence":
                // This is where we calculate the value if we are sorting by
                // the "Manually sort folders" sequence.
                return compareByManuallySortFoldersOrder({
                    folderObjectA,
                    folderObjectB,
                });
                break;
            default:
                console.log("Something unexpected happened!");
                return 0;
                break;
        }

        function compareByThunderbirdDefault({ folderObjectA, folderObjectB }) {
            // GH: 2021-06-30: The following sequence of folder types is derived
            // from observation of Thunderbird's behavior. I can't find it
            // documented anywhere. I'm not sure where "templates" and "outbox"
            // belong in the list.
            const rankArray = [
                "inbox", // 0
                "drafts", // 1
                "sent", // 2
                "archives", // 3
                "junk", // 4?
                "trash", // 5
                "templates", // 6 ?
                "outbox", // 7 ?
            ];

            function getFolderRank(folderObject) {
                let rank = rankArray.indexOf(folderObject.type);
                if (rank === -1) {
                    rank = 9; // i.e. file alphabetically after the others
                }
                return rank;
            }

            const folderObjectARank = getFolderRank(folderObjectA);
            const folderObjectBRank = getFolderRank(folderObjectB);

            if (folderObjectARank === folderObjectBRank) {
                return compareAlphabetically({ folderObjectA, folderObjectB });
            } else {
                if (folderObjectARank < folderObjectBRank) {
                    return -1
                } else {
                    return 1
                }
            }
        }

        function compareAlphabetically({ folderObjectA, folderObjectB }) {
            const pathA = folderObjectA.path.toLowerCase();
            const pathB = folderObjectB.path.toLowerCase();
            if (pathA < pathB) {
                return -1;
            } else if (pathA > pathB) {
                return 1;
            } else {
                return 0;
            }
        }

        function compareByManuallySortFoldersOrder(parametersObject) {
            const { folderObjectA, folderObjectB } = parametersObject;

            function getFolderRank(folderObject) {
                const folderPath = folderObject.path;
                let rank = manuallySortFoldersSortOrderDataObject[folderPath];
                return rank;
            }

            const folderObjectARank = getFolderRank(folderObjectA);
            const folderObjectBRank = getFolderRank(folderObjectB);

            if (folderObjectARank === folderObjectBRank) {
                return compareAlphabetically({ folderObjectA, folderObjectB });
            } else if (folderObjectARank === undefined) {
                return 1; // Sort folderObjectA after folderObjectB.
            } else if (folderObjectBRank === undefined) {
                return -1; // Sort folderObjectB after folderObjectA.
            } else if (folderObjectARank < folderObjectBRank) {
                return -1;
            } else {
                return 1;
            }
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

// flattenFolders() is a helper function used by options.js to generate an
// array that lists all mailbox folders, with each folder listed in the format
// `${accountName}: ${folderPath}`.

function flattenFolders(accountsArray) {
    // This will contain the strings we display.
    let flatFoldersArray = [];
    // This will be used so that this extension can keep track of which accounts
    // and folders those strings represent. This array is necessary so that this
    // extension can handle the rare instance where an account name or folder
    // path contains the string ": ".
    let flatFoldersCorrespondences = [];

    for (const accountIndex of Object.keys(accountsArray)) {
        const accountName = accountsArray[accountIndex].name;

        doDepthFirstScanOfFolders(accountsArray[accountIndex].folders);

        function doDepthFirstScanOfFolders(nestedFoldersArray) {
            for (const folder of nestedFoldersArray) {
                const folderDescription = accountName + ": " + folder.path;
                flatFoldersArray.push(folderDescription);
                flatFoldersCorrespondences.push({
                    accountName: accountName,
                    folderPath: folder.path,
                });

                if (folder.subFolders && folder.subFolders.length > 0) {
                    doDepthFirstScanOfFolders(folder.subFolders);
                }
            }
        }
    }

    return { flatFoldersArray, flatFoldersCorrespondences };
}

////////////////////////////////////////////////////////////////////////////////

// getFilterFunction() is a helper function used by options.js.

function getFilterFunction(searchString) {
    return commandObject => {
        if (
            commandObject.name.slice(0, searchString.length) ===
            searchString
        ) {
            return true;
        } else {
            return false;
        }
    }
}

////////////////////////////////////////////////////////////////////////////////

// These functions are used by options.js.

async function getFavoriteFolders() {
    const folderPreferences =
        await browser.storage.local.get("favoriteFolders");

    return folderPreferences;
}

async function addToFavoriteFolders(favoriteFolders, key, value) {
    var localFavorites = favoriteFolders.hasOwnProperty("favoriteFolders") ?
        favoriteFolders['favoriteFolders'] : {};
    if (key in localFavorites) {
        localFavorites[key].push(value)
    } else {
        localFavorites[key] = [value]
    }
    var add = await browser.storage.local.set({
        favoriteFolders: localFavorites
    });
}

async function removeFromFavoriteFolders(favoriteFolders, key, value) {
    const index = favoriteFolders['favoriteFolders'][key].indexOf(value);
    if (index > -1) {
        favoriteFolders['favoriteFolders'][key].splice(index, 1);
        await browser.storage.local.set({
            favoriteFolders: favoriteFolders['favoriteFolders']
        });
    }
}

async function isInFavorites(favoriteFolders, key, value) {
    return (
        favoriteFolders.hasOwnProperty("favoriteFolders") &&
        key in favoriteFolders['favoriteFolders'] &&
        favoriteFolders['favoriteFolders'][key].includes(value)
    );
}

////////////////////////////////////////////////////////////////////////////////

/*

// Right now, none of this commented-out code is needed. It is being left here
// only as an example to follow for future development.

// Handle the command received from the content script:
const doHandleCommand = async (message, sender) => {
    const { command } = message;
    const {
        tab: { id: tabId },
    } = sender;

    const messageHeader =
        await browser.messageDisplay.getDisplayedMessage(tabId);

    // Check for known commands:
    // (None of these commands are currently in use; they are left here as
    // examples to follow.)
    switch (command.toLocaleLowerCase()) {
        case "getnotificationdetails":
            {
                // Create the information chunk we want to return to our message
                // content script:
                return {
                    text: `Mail subject is "${messageHeader.subject}"`,
                };
            }
            break;
        case "markunread":
            {
                // Get the current message from the given tab:
                if (messageHeader) {
                    // Mark the message as unread:
                    browser.messages.update(messageHeader.id, {
                        read: false,
                    });
                }
            }
            break;
    }
};

// Handle the received message by filtering for all messages whose "type"
// property is set to "command":
const handleMessage = (message, sender, sendResponse) => {
    if (message && message.hasOwnProperty("command")) {
        // If we have a command, return a promise from the command handler:
        return doHandleCommand(message, sender);
    }
};

// Add a handler for communication with other parts of the extension, like our
// messageDisplayScript. (There should be only one handler in the background
// script for all incoming messages.)
browser.runtime.onMessage.addListener(handleMessage);

*/

////////////////////////////////////////////////////////////////////////////////
