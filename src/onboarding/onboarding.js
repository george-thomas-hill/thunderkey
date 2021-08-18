// © 2021 Sarah Forest and George Hill
//
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.

document.getElementById("options-page").addEventListener("click", openOptions);

async function openOptions() {
    await browser.runtime.openOptionsPage()
}

var year = document.getElementById("currentYear");
year.innerHTML = (new Date()).getFullYear();
