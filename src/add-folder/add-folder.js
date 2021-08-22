// © 2021 Sarah Forest and George Hill
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

////////////////////////////////////////////////////////////////////////////////

// Give focus to the correct input element.
const putFocus = () => {
    document.getElementById('folder-name').focus();
};

document.addEventListener("DOMContentLoaded", putFocus);

////////////////////////////////////////////////////////////////////////////////

var bg = chrome.extension.getBackgroundPage();

var foldersByAccountId = {};
var accounts;

var mailTabDisplayedFolder = null;

// Call the browser.accounts.list() function in background.js.
bg.getAccounts().then((res) => {
    bg.sortAccountsAndFolders(res).then(() => {
        accounts = res;

        // Dynamically load the account list and folder list using the accounts
        // data from returned from background.js.
        var dropdown = document.getElementById('dropdown-accounts');
        var folders = document.getElementById('dropdown-folders');

        browser.mailTabs.query({ active: true }).then((mailTab) => {
            mailTabDisplayedFolder = mailTab[0].displayedFolder;
            accounts.forEach((item, index) => {
                foldersByAccountId[item.id] =
                    recursivelyGetFolderList(item.folders);
                let option = document.createElement("option")
                option.text = item.name;
                option.value = item.id;
                if (mailTabDisplayedFolder != null) {
                    option.selected =
                        item.id == mailTabDisplayedFolder.accountId ?
                            true : false;
                } else {
                    option.selected = index == 0 ? true : false;
                }

                if (option.selected)
                    foldersByAccountId[item.id].forEach((folder, ind) => {
                        let folderOption = document.createElement("option");

                        setClass(folderOption, folder.path.split('/').length);
                        // Need to set folderOption.text to folder.path because
                        // subfolders aren't displaying as indented in Windows
                        // Thunderbird 91. -- GH
                        folderOption.text = folder.path;
                        folderOption.value = folder.path;
                        if (mailTabDisplayedFolder != null) {
                            folderOption.selected =
                                folder.path == mailTabDisplayedFolder.path ?
                                    true : false;
                        } else {
                            folderOption.selected = ind == 0 ? true : false;
                        }

                        folders.appendChild(folderOption);
                    });
                dropdown.appendChild(option);
            });
        });
    });
});

var selectOption = document.getElementById('dropdown-accounts');

selectOption.addEventListener('change', (event) => {
    var folders = document.getElementById('dropdown-folders')
    while (folders.firstChild) {
        folders.removeChild(folders.firstChild);
    }

    foldersByAccountId[event.target.value].forEach((folder, ind) => {
        let folderOption = document.createElement("option")

        setClass(folderOption, folder.path.split('/').length)
        folderOption.text = folder.name;
        folderOption.value = folder.path;
        folderOption.selected = ind == 0 ? true : false;
        folders.appendChild(folderOption);
    });
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

let form = document.getElementById('create-folder');

form.addEventListener('submit', (event) => {
    addNewFolder(event);
});

async function addNewFolder(event) {
    event.preventDefault();
    let window = await browser.windows.getCurrent();
    let account = form.elements['account-name'].value;
    let folder = form.elements['parent-folder-name'].value;
    let newFolder = form.elements['folder-name'].value;

    let folderPathExists =
        findFolder(folder + '/' + newFolder, foldersByAccountId[account]);

    if (!folderPathExists) {
        bg.createNewFolder(window.id, account, folder, newFolder);
    } else {
        if (!document.getElementById("dangerText")) {
            var folderInput =
                document.getElementsByClassName('folder-name-input')[0];
            var dangerText = document.createElement('span');
            dangerText.innerHTML = "Folder already exists in subfolder, "
                + " please rename the folder to proceed.";
            dangerText.setAttribute('class', 'text-danger');
            dangerText.id = "dangerText";

            folderInput.append(dangerText);
        }
    }
}

function findFolder(folderPath, foldersList) {
    var found = false;
    foldersList.forEach((folder) => {
        if (folderPath == folder.path) {
            found = true;
        }
    })
    return found;
}

var cancelButton = document.createElement('a');
cancelButton.innerHTML = 'Cancel';
cancelButton.setAttribute('href', '#');
cancelButton.classList.add('btn');
cancelButton.classList.add('btn-danger');
cancelButton.onclick = function (event) {
    event.preventDefault();
    browser.windows.getCurrent().then((window) => {
        browser.windows.remove(window.id).then({});
    });
};

form.append(cancelButton);
