// © 2021 Sarah Forest and George Hill
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

var bg = chrome.extension.getBackgroundPage();

var foldersByAccountId = {};
var accounts;

var mailTabDisplayedFolder = null;

var sentFolders = {};

var mostRecentMessage = null;

var favoriteFolders = {};

getFavorites();

async function getFavorites() {
    favoriteFolders = await bg.getFavoriteFolders();
    favoriteFolders = favoriteFolders.hasOwnProperty("favoriteFolders") ?
        favoriteFolders['favoriteFolders'] : {};
}

var favoriteSelected = false;

const putFocus = () => {
    document.getElementById('dropdown-folders-move').focus();
};

document.addEventListener("DOMContentLoaded", putFocus);

bg.getAccounts().then((res) => {
    bg.sortAccountsAndFolders(res).then(() => {
        accounts = res;
        var dropdown = document.getElementById('dropdown-accounts-move');
        var folders = document.getElementById('dropdown-folders-move');
        var dropdownOrig =
            document.getElementById('dropdown-accounts-original-move');

        browser.mailTabs.query({ active: true }).then((mailTab) => {
            mailTabDisplayedFolder = mailTab[0].displayedFolder;

            accounts.forEach((item, index) => {
                foldersByAccountId[item.id] =
                    recursivelyGetFolderList(item.folders);
                let option = document.createElement("option")
                option.text = item.name;
                option.value = item.id;

                let option2 = document.createElement("option")
                option2.text = item.name;
                option2.value = item.id;

                if (mailTabDisplayedFolder != null) {
                    option.selected =
                        item.id == mailTabDisplayedFolder.accountId ?
                            true : false;
                    option2.selected =
                        item.id == mailTabDisplayedFolder.accountId ?
                            true : false;
                } else {
                    option.selected = index == 0 ? true : false;
                    option2.selected = index == 0 ? true : false;
                }

                foldersByAccountId[item.id].forEach((folder, ind) => {
                    if (folder.type && folder.type == "sent") {
                        sentFolders[folder.accountId] = folder;
                    }

                    if (option.selected) {
                        let folderOption = document.createElement("option");

                        setClass(folderOption, folder.path.split('/').length);
                        folderOption.text = folder.name;
                        folderOption.value = folder.path;

                        if (
                            !favoriteSelected && mailTabDisplayedFolder != null
                        ) {
                            folderOption.selected =
                                folder.path == mailTabDisplayedFolder.path ?
                                    true : false;
                        } else if (!favoriteSelected) {
                            folderOption.selected = ind == 0 ? true : false;
                        }

                        folders.appendChild(folderOption);
                    }
                });
                dropdown.appendChild(option);
                if (sentFolders[item.id])
                    dropdownOrig.appendChild(option2);
            });

            let optGroupAll = document.createElement('optgroup');
            optGroupAll.setAttribute('label', 'All Folders');
            folders.prepend(optGroupAll);

            let optGroupFavorites = document.createElement('optgroup');
            optGroupFavorites.setAttribute('label', 'Favorite Folders');
            folders.prepend(optGroupFavorites);
            if (
                mailTabDisplayedFolder &&
                mailTabDisplayedFolder.accountId in favoriteFolders
            ) {
                favoriteFolders[mailTabDisplayedFolder.accountId].forEach(
                    (item, index) => {
                        const findFolder =
                            foldersByAccountId[mailTabDisplayedFolder.accountId].
                                find(elem => elem.path == item);
                        let option = document.createElement("option")
                        option.text = findFolder.name;
                        option.value = findFolder.path;
                        option.selected = index === 0 ? true : false;
                        if (index === 0)
                            favoriteSelected = true;
                        optGroupFavorites.append(option);
                    }
                );
            } else if (!mailTabDisplayedFolder && accounts[0].id) {
                favoriteFolders[accounts[0].id].forEach((item, index) => {
                    const findFolder = foldersByAccountId[accounts[0].id].
                        find(elem => elem.path == item);
                    let option = document.createElement("option");
                    option.text = item.name;
                    option.value = item.path;
                    option.selected = index === 0 ? true : false;
                    if (index === 0) {
                        favoriteSelected = true;
                    }
                    optGroupFavorites.append(option);
                })
            }

            var messageSent = document.getElementById('sent-message');

            if (sentFolders[mailTabDisplayedFolder.accountId]) {
                bg.getMostRecentMessage(
                    sentFolders[mailTabDisplayedFolder.accountId]
                ).then(
                    (folderMessage) => {
                        if (folderMessage.id != 0) {
                            showSubmitOption();
                            mostRecentMessage = folderMessage;
                            var recip = folderMessage.recipients.join();
                            recip = recip.replaceAll('<', '(');
                            recip = recip.replaceAll('>', ')');
                            messageSent.innerHTML =
                                "<div class='card-header py-1'>" +
                                "Most Recent Message In Sent Folder</div>" +
                                "<div class='card-body py-0'>Subject: " +
                                folderMessage.subject + // TODO: Rewrite to use innerText.
                                "<br/>Recipients: " +
                                recip + // TODO: Rewrite to use innerText.
                                "</div>";
                        } else {
                            hideSubmitOption()
                            mostRecentMessage = null;
                            messageSent.innerHTML =
                                "<div class='card-header py-1'>" +
                                "No Recent Messages In Sent Folder</div>";
                        }
                    }
                );
            } else if (Object.keys(sentFolders).length > 0) {
                bg.getMostRecentMessage(sentFolders[Object.keys(sentFolders)[0]]).
                    then(
                        (folderMessage) => {
                            if (folderMessage.id != 0) {
                                showSubmitOption();
                                mostRecentMessage = folderMessage;
                                var recip = folderMessage.recipients.join();
                                recip = recip.replaceAll('<', '(');
                                recip = recip.replaceAll('>', ')');
                                messageSent.innerHTML =
                                    "<div class='card-header py-1'>" +
                                    "Most Recent Message In Sent Folder</div>" +
                                    "<div class='card-body py-0'>Subject: " +
                                    folderMessage.subject + // TODO: Rewrite to use innerText.
                                    "<br/>Recipients: " + recip + "</div>"; // TODO: Rewrite to use innerText.
                            } else {
                                hideSubmitOption()
                                mostRecentMessage = null;
                                messageSent.innerHTML =
                                    "<div class='card-header py-1'>" +
                                    "No Recent Messages In Sent Folder</div>";
                            }
                        }
                    );
            } else {
                hideSubmitOption()
                mostRecentMessage = null;
                messageSent.innerHTML =
                    "<div class='card-header py-1'>No Sent Folders Setup</div>";
            }
        })
    });
});

function showSubmitOption() {
    var buttonSubmit = document.getElementsByClassName('btn btn-primary')[0];
    var formLabel = document.getElementsByClassName('form-label');
    var dropdownOpt = document.getElementById('dropdown-folders-move');
    var folderOpt = document.getElementById('dropdown-accounts-move');

    buttonSubmit.style.display = formLabel[0].style.display =
        formLabel[1].style.display = folderOpt.style.display =
        dropdownOpt.style.display = "block";
}

function hideSubmitOption() {
    var formLabel = document.getElementsByClassName('form-label');
    var buttonSubmit = document.getElementsByClassName('btn btn-primary')[0];
    var dropdownOpt = document.getElementById('dropdown-folders-move');
    var folderOpt = document.getElementById('dropdown-accounts-move');

    buttonSubmit.style.display = formLabel[0].style.display =
        formLabel[1].style.display = folderOpt.style.display =
        dropdownOpt.style.display = "none";
}

var selectOption = document.getElementById('dropdown-accounts-move');

selectOption.addEventListener('change', (event) => {
    var folders = document.getElementById('dropdown-folders-move')
    while (folders.firstChild) {
        folders.removeChild(folders.firstChild);
    }

    favoriteSelected = false;

    let optGroupFavorites = document.createElement('optgroup');
    optGroupFavorites.setAttribute('label', 'Favorite Folders');
    folders.append(optGroupFavorites);

    if (event.target.value in favoriteFolders) {
        favoriteFolders[event.target.value].forEach((item, index) => {
            const findFolder =
                foldersByAccountId[event.target.value].find(
                    elem => elem.path == item
                );

            let option = document.createElement("option")
            option.text = findFolder.name;
            option.value = findFolder.path;
            option.selected = index === 0 ? true : false;
            if (index === 0) favoriteSelected = true;
            optGroupFavorites.append(option);
        });
    }

    let optGroupAll = document.createElement('optgroup');
    optGroupAll.setAttribute('label', 'All Folders');
    folders.append(optGroupAll);

    foldersByAccountId[event.target.value].forEach((folder, ind) => {
        let folderOption = document.createElement("option")

        setClass(folderOption, folder.path.split('/').length);
        folderOption.text = folder.name;
        folderOption.value = folder.path;
        if (!favoriteSelected) folderOption.selected = ind == 0 ? true : false;
        folders.appendChild(folderOption);
    });
});

var selectOptionOriginal =
    document.getElementById('dropdown-accounts-original-move');

selectOptionOriginal.addEventListener('change', (event) => {
    var messageSent = document.getElementById('sent-message');

    bg.getMostRecentMessage(sentFolders[event.target.value]).then(
        (folderMessage) => {
            if (folderMessage.id != 0) {
                showSubmitOption();
                mostRecentMessage = folderMessage;
                var recip = folderMessage.recipients.join();
                recip = recip.replaceAll('<', '(');
                recip = recip.replaceAll('>', ')');
                messageSent.innerHTML =
                    "<div class='card-header py-1'>" +
                    "Most Recent Message in Sent Folder</div>" +
                    "<div class='card-body py-0'>Subject: " +
                    folderMessage.subject + // TODO: Rewrite to use innerText.
                    "<br/>Recipients: " +
                    recip + // TODO: Rewrite to use innerText.
                    "</div>";
            } else {
                hideSubmitOption();
                mostRecentMessage = null;
                messageSent.innerHTML =
                    "<div class='card-header py-1'>" +
                    "No Recent Messages In Sent Folder</div>";
            }
        }
    );
});

function setClass(folderOption, indentClass) {
    if (indentClass > 2)
        switch (indentClass) {
            case 3:
                folderOption.setAttribute(
                    'class',
                    'indent'
                )
                break;
            case 4:
                folderOption.setAttribute(
                    'class',
                    'indent secondary'
                )
                break;
            case 5:
                folderOption.setAttribute(
                    'class',
                    'indent tertiary'
                )
                break;
            case 6:
                folderOption.setAttribute(
                    'class',
                    'indent four'
                )
                break;
            case 7:
                folderOption.setAttribute(
                    'class',
                    'indent five'
                )
                break;
            default:
                folderOption.setAttribute(
                    'class',
                    'indent six'
                )
                break;
        }
}

// Use recursion to flatten the subfolders and folders into one list.
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

let form = document.getElementById('move-sent-folder');

form.addEventListener('submit', (event) => {
    event.preventDefault();
    browser.windows.getCurrent().then((window) => {
        let account = form.elements['account-name-move'].value;
        let folder = form.elements['parent-folder-name-move'].value;

        bg.moveMessageToSpecifiedFolder(
            window.id,
            account,
            folder,
            mostRecentMessage
        );
    });
});

var cancelButton = document.getElementById('cancel');

cancelButton.onclick = function (event) {
    event.preventDefault();
    browser.windows.getCurrent().then((window) => {
        browser.windows.remove(window.id).then({});
    });
};

let formButton = document.getElementById('button-group');

formButton.append(cancelButton);
