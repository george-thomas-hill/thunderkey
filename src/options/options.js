// © 2021 Sarah Forest and George Hill
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

// https://bugzilla.mozilla.org/show_bug.cgi?id=1641577#c16
const backgroundPage = window.browser.extension.getBackgroundPage();
window.browser = backgroundPage.browser;

// Set a constant that can be used throughout this file.
const thisIsAMac = navigator.platform.indexOf("Mac") !== -1;

// Execute main(), an async function that is needed so that "await" can be used
// with API calls.
main();

async function main() {
    var year = document.getElementById("currentYear");
    year.innerHTML = (new Date()).getFullYear();

    fleshOutTheOptionsDiv();

    async function fleshOutTheOptionsDiv() {
        // Get experimentalShortcutsPreferences.
        const experimentalShortcutsPreferences =
            await backgroundPage.getExperimentalShortcutsPreferences();

        // Convert experimentalShortcutsPreferences into a properly formatted
        // array.
        let experimentalShortcutsPreferencesArray = [];
        for (const command of Object.keys(experimentalShortcutsPreferences)) {
            let commandObject = {};
            commandObject["Actual Command"] = command;
            commandObject["Command"] =
                experimentalShortcutsPreferences[command].description;
            commandObject["Shortcut"] = thisIsAMac ?
                experimentalShortcutsPreferences[command].shortcutMac
                :
                experimentalShortcutsPreferences[command].shortcut;
            commandObject["Change Shortcut"] = "";
            commandObject["Reset to Default"] = "";
            commandObject["Disable"] = "";
            experimentalShortcutsPreferencesArray.push(commandObject);
        }

        ////////////////////////////////////////////////////////////////////////

        // Build a table that lets the user edit those preferences--except for
        // the preferences relating to specific folders.
        generateExperimentalShortcutsPreferencesTable();

        async function generateExperimentalShortcutsPreferencesTable() {
            // Get the HTML element.
            let experimentalShortcutsTable =
                document.getElementById("experimental-shortcuts");

            // Take experimentalShortcutsPreferencesArray, and filter _out_ the
            // "selectFolder-" and "moveToFolder-" commands.
            const filteredPreferencesArray = filterOutCommands(true);

            // Actually generate the table.
            generateTable(
                experimentalShortcutsTable,
                filteredPreferencesArray,
            );

            // https://www.valentinog.com/blog/html-table/
            function generateTable(table, dataArray) {
                // Insert one row for each element of dataArray.
                for (const element of dataArray) {
                    let row = table.insertRow();
                    const command = element["Actual Command"];
                    row.id = command;
                    // Insert one cell for each key in element:
                    for (const key in element) {
                        if (key === "Actual Command") {
                            // But don't generate a cell in this instance.
                            continue;
                        }

                        // Actually create the cell.
                        let cell = row.insertCell();
                        if (key === "Shortcut") {
                            cell.id = `${command}-shortcut`;
                        }

                        // Prepare to create the cell contents.
                        let cellContents = null;
                        if (key === "Change Shortcut") {
                            cellContents = createButtonCell(
                                command,
                                cell,
                                "Edit",
                                changeShortcut,
                            );
                            cellContents.setAttribute(
                                'class',
                                'my-0 btn btn-block btn-primary'
                            );
                        } else if (key === "Reset to Default") {
                            cellContents = createButtonCell(
                                command,
                                cell,
                                "Reset",
                                resetShortcut,
                            );
                            cellContents.setAttribute(
                                'class',
                                'my-0 btn btn-block btn-warning'
                            );
                        } else if (key === "Disable") {
                            cellContents = createButtonCell(
                                command,
                                cell,
                                "Disable",
                                disableShortcut,
                            );
                            cellContents.setAttribute(
                                'class',
                                'my-0 btn btn-block btn-danger'
                            );
                        } else {
                            cellContents = document.createElement("span");
                            cellContents.setAttribute(
                                "class",
                                "my-0 btn btn-block btn-custom",
                            );
                            // We'll need to create the shortcut cell.
                            if (thisIsAMac) {
                                var newStr =
                                    element[key].replace("Meta", "Command");
                                cellContents.innerText = newStr;
                            }
                            else {
                                cellContents.innerText = element[key];
                            }
                        }
                        cell.appendChild(cellContents);
                    }
                }

                generateTableHead(table, Object.keys(dataArray[0]));

                function generateTableHead(table, data) {
                    let thead = table.createTHead();
                    let row = thead.insertRow();
                    for (const key of data) {
                        if (key === "Actual Command") {
                            continue;
                        }
                        let th = document.createElement("th");
                        let text = document.createTextNode(key);
                        th.appendChild(text);
                        row.appendChild(th);
                    }
                }
            }
        }

        ////////////////////////////////////////////////////////////////////////

        // The following functions support the table generated above--and also
        // the table generated below.

        // This function is used to filter out (or filter in) commands that
        // relate to specific folders.
        function filterOutCommands(filterThemOutBoolean) {
            const filteredPreferencesArray =
                experimentalShortcutsPreferencesArray.filter(filterFunction);

            function filterFunction(commandObject) {
                const commandString = commandObject["Actual Command"];
                const selectFolderString = "selectFolder";
                const moveToFolderString = "moveToFolder";
                const selectFolderBoolean =
                    commandString.slice(0, selectFolderString.length) ===
                    selectFolderString;
                const moveToFolderBoolean =
                    commandString.slice(0, moveToFolderString.length) ===
                    moveToFolderString;
                if (selectFolderBoolean || moveToFolderBoolean) {
                    return filterThemOutBoolean ? false : true;
                } else {
                    return filterThemOutBoolean ? true : false;
                }
            }

            return filteredPreferencesArray;
        }

        function createButtonCell(command, cell, labelText, callback) {
            let cellContents = null;
            cell.className = "centered";
            cellContents = document.createElement("button");
            const label = document.createTextNode(labelText);
            cellContents.appendChild(label);
            cellContents.dataset.command = command;
            cellContents.addEventListener("click", callback);
            cellContents.addEventListener("mouseleave", blurIt);
            return cellContents;
        }

        // This function is called when the user clicks on an "Edit" button.
        function changeShortcut(event) {
            event.target.blur();
            event.stopPropagation();

            let commandSpan = document.getElementById("experimental-command");
            const oldCommand = commandSpan.innerText;

            if (oldCommand !== "") {
                let oldShortcutCell =
                    document.getElementById(`${oldCommand}-shortcut`).firstChild;
                oldShortcutCell.className = "my-0 btn btn-block btn-custom";
            }

            const newCommand = event.target.dataset.command;
            commandSpan.innerText = newCommand;

            let newShortcutCell =
                document.getElementById(`${newCommand}-shortcut`).firstChild;


            newShortcutCell.className = "my-0 btn btn-block btn-custom active";
        }

        // This function is called when the user clicks on a "Reset" button.
        async function resetShortcut(event) {
            event.target.blur();
            event.stopPropagation();

            let commandSpan = document.getElementById("experimental-command");
            const oldCommand = commandSpan.innerText;

            if (oldCommand !== "") {
                let oldShortcutCell =
                    document.getElementById(`${oldCommand}-shortcut`).firstChild;
                oldShortcutCell.className = "my-0 btn btn-block btn-custom";
                commandSpan.innerText = "";
            }

            const command = event.target.dataset.command;

            const defaultExperimentalShortcutsPreferencesObject =
                backgroundPage.
                    getDefaultExperimentalShortcutsPreferencesObject();

            const shortcutKey = thisIsAMac ? "shortcutMac" : "shortcut";

            const keyCombination =
                defaultExperimentalShortcutsPreferencesObject[command]
                [shortcutKey];

            await updateShortcutPreference({
                command,
                keyCombination,
            });

            let shortcutCell = document.getElementById(`${command}-shortcut`).firstChild;

            if (thisIsAMac) {
                var newStr = keyCombination.replace("Meta", "Command");
                shortcutCell.innerText = newStr;
            } else {
                shortcutCell.innerText = keyCombination;
            }
        }

        // This function is called when the user clicks on a "Disable" button.
        async function disableShortcut(event) {
            event.target.blur();
            event.stopPropagation();

            let commandSpan = document.getElementById("experimental-command");
            const oldCommand = commandSpan.innerText;

            if (oldCommand !== "") {
                let oldShortcutCell =
                    document.getElementById(`${oldCommand}-shortcut`).firstChild;
                oldShortcutCell.className = "my-0 btn btn-block btn-custom";
                commandSpan.innerText = "";
            }

            const command = event.target.dataset.command;

            const keyCombination = "Disabled";

            await updateShortcutPreference({
                command,
                keyCombination,
            });

            let shortcutCell = document.getElementById(`${command}-shortcut`).firstChild;
            shortcutCell.innerText = keyCombination;
        }

        // The buttons were keeping focus after being clicked.
        function blurIt(event) {
            event.target.blur();
        }

        // Handle uncaught clicks (i.e. clicks other than those generated by
        // clicking on one of the buttons).
        document.addEventListener("click", handleUncaughtClicks);

        async function handleUncaughtClicks(event) {
            let commandSpan = document.getElementById("experimental-command");
            let command = commandSpan.innerText;

            // If we're not editing a command right now, then there is nothing
            // to do in response to this click.
            if (command === "") return

            // Otherwise, we need to cancel editing the command.
            let oldShortcutCell =
                document.getElementById(`${command}-shortcut`).firstChild;
            oldShortcutCell.className = "my-0 btn btn-block btn-custom";

            commandSpan.innerText = "";
        }

        // Listen for keydowns.
        document.addEventListener("keydown", handleKeydowns);

        async function handleKeydowns(event) {
            // Here begins some code that is repeated in
            // api/thunderkey_api/implementation.js.
            const keyCombination = convertEventToKeyCombination(event);

            function convertEventToKeyCombination(event) {
                if (
                    event.key === "Alt" ||
                    event.key === "Control" ||
                    event.key === "Meta" ||
                    event.key === "Shift"
                ) {
                    return "";
                }

                let keyCombinationArray = [];

                if (event.altKey) keyCombinationArray.push("Alt");
                if (event.ctrlKey) keyCombinationArray.push("Ctrl");
                if (event.metaKey) keyCombinationArray.push("Meta");
                if (event.shiftKey) keyCombinationArray.push("Shift");

                keyCombinationArray.push(event.key);

                const keyCombination = keyCombinationArray.join("+")

                return keyCombination;
            }
            // Here ends the code that is repeated.

            // If the only key pressed was a modifier key, then there's nothing
            // to do.
            if (keyCombination === "") return;

            let displaySpan = document.getElementById("experimental-keypress");
            displaySpan.innerText = keyCombination;

            let commandSpan = document.getElementById("experimental-command");
            let command = commandSpan.innerText;

            // If the user presses a key _before_ pressing the "Edit" button,
            // then there's nothing to do.
            if (command === "") return

            let oldShortcutCell =
                document.getElementById(`${command}-shortcut`).firstChild;
            oldShortcutCell.className = "my-0 btn btn-block btn-custom";

            // We're about to act one way or another, so commandSpan.innerText
            // should be cleared out.
            commandSpan.innerText = "";

            // If the user pressed "Escape", that means we are _canceling_ input
            // of a new key combination.
            if (keyCombination === "Escape") {
                return;
            }

            // If we get this far, that means we need to update the key
            // combination for the command in question.
            event.preventDefault();
            event.stopPropagation();

            await updateShortcutPreference({ command, keyCombination });
            if (thisIsAMac) {
                var newStr = keyCombination.replace("Meta", "Command");
                oldShortcutCell.innerText = newStr;
            } else {
                oldShortcutCell.innerText = keyCombination;
            }
        }

        // This function does (most of) the actual work of the two generated
        // tables.
        async function updateShortcutPreference({ command, keyCombination }) {
            const shortcutKey = thisIsAMac ? "shortcutMac" : "shortcut";
            experimentalShortcutsPreferences[command][shortcutKey] =
                keyCombination;
            await browser.storage.local.set({
                experimentalShortcutsPreferences:
                    experimentalShortcutsPreferences,
            });
        }

        ////////////////////////////////////////////////////////////////////////

        // Build a table that lets the user edit the folder-specific
        // preferences.

        generateSelectAndMoveTable();

        async function generateSelectAndMoveTable() {
            // Get accountsArray from the WebExtension API.
            let accountsArray = await browser.accounts.list();

            // Sort the accountsArray in place so that its folder arrays are in
            // the same order as that shown in the main Thunderbird window.
            await backgroundPage.sortAccountsAndFolders(accountsArray);

            // Generate flatFoldersArray, which is a flat array of all folders,
            // with each element being a string in the format "accountName:
            // folderPath".
            //
            // Also generate flatFoldersCorrespondences, which is a flat array
            // of objects, in which each object corresponds to the corresponding
            // string in flatFoldersArray, and in which each object is of the
            // form { accountName, folderPath }.
            //
            let { flatFoldersArray, flatFoldersCorrespondences } =
                backgroundPage.flattenFolders(accountsArray);

            // Add an element to those arrays to represent the _absence_ of a
            // selected folder.
            flatFoldersArray = [
                "",
                ...flatFoldersArray,
            ]
            flatFoldersCorrespondences = [
                {
                    accountName: "",
                    folderPath: "",
                },
                ...flatFoldersCorrespondences,
            ]

            // Take experimentalShortcutsPreferencesArray, and filter _in_ the
            // "selectFolder-" and "moveToFolder-" commands.
            const filteredPreferencesArray = filterOutCommands(false);

            // Determine the number of such commands. We have to divide by two
            // because filteredPreferencesArray contains both "selectFolder-"
            // and "moveToFolder-" commands.
            const numberOfSelectAndMoveCommands =
                filteredPreferencesArray.length / 2;

            // Get folderPreferencesArray from the WebExtension API; this is
            // where we record which folder is folder 1, which is folder 2, etc.
            // Each element in folderPreferencesArray will be an object in this
            // format: { accountName, folderPath }.
            const folderPreferences =
                await browser.storage.local.get("folderPreferences");
            const folderPreferencesArray =
                folderPreferences.folderPreferences || [];

            // Build the table that has been started in options.html.

            // https://www.valentinog.com/blog/html-table/

            let selectAndMoveTable = document.getElementById("select-and-move");

            // Generate an array that will have one element for each row of the
            // table. Each element will be an object; the keys of the object
            // will correspond to each column of the table.
            let selectAndMoveTableRows = [];
            for (let i = 0; i < numberOfSelectAndMoveCommands; i++) {
                // For each row of the table . . .
                let commandObject = {};

                // Set the "Folder #" key and value:
                commandObject["Folder #"] = `${i + 1}`;

                // Set the "Folder" key and value:
                const nullFolderObject = {
                    accountName: "",
                    folderPath: "",
                };
                let folderObject =
                    folderPreferencesArray[i] || nullFolderObject;
                let folderDescriptionString =
                    `${folderObject.accountName}: ${folderObject.folderPath}`;
                if (folderDescriptionString === ": ") {
                    folderDescriptionString = "";
                }
                commandObject["Folder"] = folderDescriptionString;

                // Set each shortcut key and value:
                const shortcutKeysArray = [
                    {
                        label: "Select Folder Shortcut",
                        commandPrefix: "selectFolder-",
                    },
                    {
                        label: "Move Messages Shortcut",
                        commandPrefix: "moveToFolder-",
                    },
                ];
                for (const shortcutKeyObject of shortcutKeysArray) {
                    const theKey = shortcutKeyObject.label;
                    const theCommand =
                        shortcutKeyObject.commandPrefix + (i + 1);
                    const theOtherKey = thisIsAMac ? "shortcutMac" : "shortcut";
                    let theShortcutString =
                        experimentalShortcutsPreferences[theCommand][theOtherKey];
                    if (theShortcutString === "") {
                        // We might be upgrading from an earlier version.
                        theShortcutString = "Disabled";
                    }
                    commandObject[theKey] = theShortcutString;
                }
                selectAndMoveTableRows.push(commandObject);
            }

            // Now use that array to actually generate the table.
            generateTable(selectAndMoveTable, selectAndMoveTableRows);

            function generateTable(table, arrayOfObjects) {
                let folderNumber = 0;
                for (let element of arrayOfObjects) {
                    let row = table.insertRow();
                    for (const key in element) {
                        let cell = row.insertCell();
                        let cellContents = null;
                        if (key === "Folder #") {
                            cellContents =
                                document.createTextNode(element[key]);
                            cell.className = "centered";
                            cell.appendChild(cellContents);
                        } else if (key === "Folder") {
                            cellContents = createSelectElement({
                                sourceArray: flatFoldersArray,
                                folderNumber,
                                selectedValue: element[key],
                            });
                            cellContents.setAttribute(
                                'class',
                                'my-0 folder-list'
                            );

                            cell.appendChild(cellContents);
                        } else {
                            // We must be creating a shortcut.

                            // We'll need to know the corresponding command.
                            const commandPrefix =
                                key === "Select Folder Shortcut" ?
                                    "selectFolder-" : "moveToFolder-";
                            const command = commandPrefix + (folderNumber + 1);


                            cellContents = document.createElement("span");
                            cellContents.setAttribute(
                                "class",
                                "my-0 btn btn-block btn-custom",
                            );
                            // We'll need to create the shortcut cell.
                            if (thisIsAMac) {
                                var newStr =
                                    element[key].replace("Meta", "Command");
                                cellContents.innerHTML = newStr; // TODO: Rewrite to use innerText.
                            }
                            else {
                                cellContents.innerHTML = element[key]; // TODO: Rewrite to use innerText.
                            }
                            cell.appendChild(cellContents);
                            cell.id = `${command}-shortcut`;

                            // And we also have to make the right buttons:
                            const buttonsArray = [
                                {
                                    label: "Edit",
                                    callback: changeShortcut,
                                    class: "my-0 btn btn-block btn-primary",
                                },
                                {
                                    label: "Disable",
                                    callback: disableShortcut,
                                    class: "my-0 btn btn-block btn-danger",
                                },
                            ];
                            for (const buttonObject of buttonsArray) {
                                let buttonCell = row.insertCell();
                                let buttonContents = createButtonCell(
                                    command,
                                    buttonCell,
                                    buttonObject.label,
                                    buttonObject.callback,
                                );
                                buttonContents.setAttribute(
                                    "class",
                                    buttonObject.class,
                                )
                                buttonCell.appendChild(buttonContents);
                            }
                        }
                    }
                    folderNumber++;
                }

                generateTableHead(table, Object.keys(arrayOfObjects[0]));

                function generateTableHead(table, keysArray) {
                    let thead = table.createTHead();
                    let row = thead.insertRow();
                    for (let key of keysArray) {
                        let th = document.createElement("th");
                        let text = document.createTextNode(key);
                        th.appendChild(text);

                        if (
                            key === "Select Folder Shortcut" ||
                            key === "Move Messages Shortcut"
                        ) {
                            th.setAttribute("colspan", "3");
                        }

                        row.appendChild(th);
                    }
                } // generateTableHead().

                // This function is used to create the folder select elements;
                // it sets event listeners that use handleSelectChange() as
                // their callback.
                function createSelectElement(parametersObject) {
                    const {
                        sourceArray,
                        folderNumber,
                        selectedValue
                    } = parametersObject;
                    // https://stackoverflow.com/questions/17001961/how-to-add-drop-down-list-select-programmatically
                    let selectElement = document.createElement("select");
                    selectElement.dataset.folderNumber = folderNumber;
                    for (var i = 0; i < sourceArray.length; i++) {
                        var option = document.createElement("option");
                        option.value = sourceArray[i];
                        option.text = sourceArray[i];
                        selectElement.appendChild(option);
                    }
                    if (selectedValue) {
                        selectElement.selectedIndex =
                            sourceArray.indexOf(selectedValue);
                    }
                    selectElement.addEventListener("change", handleSelectChange);
                    return selectElement;
                } // createSelectElement().

                // This function does the actual work of updating
                // folderPreferences.
                async function handleSelectChange(event) {
                    // The select elements have been keeping focus, which makes
                    // them look wrong. This fixes that.
                    event.target.blur();

                    // Create a newTablePreferencesArray by reading the values
                    // of all the select elements in the table.
                    let newTablePreferencesArray = [];
                    const selectElements = table.querySelectorAll("select");
                    for (const selectElement of selectElements) {
                        const folderNumber = selectElement.dataset.folderNumber;
                        const value = selectElement.value;
                        const index = flatFoldersArray.indexOf(value);
                        if (index === -1) {
                            // For whatever reason, the selected value doesn't
                            // correspond to an existing folder.
                            const nullFolderObject = {
                                accountName: "",
                                folderPath: "",
                            };
                            newTablePreferencesArray[folderNumber] =
                                nullFolderObject
                        } else {
                            const correspondingObject =
                                flatFoldersCorrespondences[index]
                            newTablePreferencesArray[folderNumber] =
                                correspondingObject;
                        }
                    }

                    // Store the new preferences in synced storage.
                    await browser.storage.local.set({
                        folderPreferences: newTablePreferencesArray,
                    });
                } // handleSelectChange().
            } // generateTable().
        } // generateSelectAndMoveTable()

        ////////////////////////////////////////////////////////////////////////

        // Load and store the favorite folders for sent messages.

        loadAndSaveFavoriteFoldersForSentMessages();

        async function loadAndSaveFavoriteFoldersForSentMessages() {
            const favoriteFolders = await backgroundPage.getFavoriteFolders();
            var favoriteList = document.getElementById('favorite-list');
            var foldersByAccountId = {};

            backgroundPage.getAccounts().then((res) => {
                backgroundPage.sortAccountsAndFolders(res).then(() => {
                    accounts = res;
                    accounts.forEach((item, index) => {
                        foldersByAccountId[item.id] =
                            backgroundPage.recursivelyGetFolderList(item.folders);
                        var insertAccountForm = document.createElement('div');
                        insertAccountForm.setAttribute('class', 'mt-4 col-12');
                        var accountName = document.createElement('div');
                        accountName.innerHTML =
                            "<b>Account Name: </b>" + item.name + "<br/><hr/>"; // TODO: Rewrite to use innerText.
                        insertAccountForm.append(accountName);

                        foldersByAccountId[item.id].forEach((folder, ind) => {
                            var enclosingDiv = document.createElement('div');
                            enclosingDiv.setAttribute('class', 'col-3');
                            enclosingDiv.setAttribute(
                                'style',
                                'display:inline-block'
                            );
                            var opt = document.createElement('input');
                            opt.setAttribute('type', 'checkbox');
                            if (
                                favoriteFolders.hasOwnProperty("favoriteFolders") &&
                                item.id in favoriteFolders['favoriteFolders'] &&
                                favoriteFolders['favoriteFolders'][item.id].includes(folder.path)
                            ) {
                                opt.setAttribute('checked', '');
                            }
                            opt.value = item.id + '___' + folder.path;
                            opt.setAttribute('id', opt.value);

                            opt.onclick = async function (event) {
                                var splitStr = event.target.value.split('___');
                                var favoriteFolders =
                                    await browser.storage.local.get("favoriteFolders");
                                var res =
                                    await backgroundPage.isInFavorites(favoriteFolders, splitStr[0], splitStr[1])
                                        ?
                                        await backgroundPage.removeFromFavoriteFolders(favoriteFolders, splitStr[0], splitStr[1])
                                        :
                                        await backgroundPage.addToFavoriteFolders(favoriteFolders, splitStr[0], splitStr[1]);
                            };
                            var labelText = document.createElement('label');
                            labelText.innerHTML = folder.name; // TODO: Rewrite to use innerText.

                            enclosingDiv.append(opt);
                            opt.setAttribute('class', 'mr-2');
                            enclosingDiv.append(labelText);
                            insertAccountForm.append(enclosingDiv);
                        });

                        favoriteList.append(insertAccountForm);
                    });
                });
            });
        } // loadAndSaveFavoriteFoldersForSentMessages()
    } // fleshOutTheOptionsDiv()
} // main()
