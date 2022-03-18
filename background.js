chrome.commands.onCommand.addListener(async command => {
    if (command !== 'toggle-palette') {
        return;
    }

    const target = {
        tabId: await getActiveTabId(),
    };

    chrome.scripting.executeScript({
        target: target,
        func: loaded,
    }, results => {
        if (results[0].result === true) {
            return sendOpenEvent(target);
        }

        injectFiles(target);
    });
});

chrome.runtime.onConnect.addListener(port => {
    port.onMessage.addListener(message => {
        switch (message.action) {
            case 'change-active-tab':
                return handleChangeActiveTab(message);

            case 'clear-history':
                return handleClearHistory(message);

            case 'close-tab':
                return handleCloseTab(message);

            case 'open-downloads':
                return handleOpenDownloads(message);

            case 'open-extensions':
                return handleOpenExtensions(message);

            case 'open-history':
                return handleOpenHistory(message);

            case 'open-settings':
                return handleOpenSettings(message);

            case 'open-tab':
                return handleOpenTab(message);

            case 'search':
                return handleSearch(message);

            default: console.error(`Unsupported action ${message.action}!`);
        }
    });
});

async function createTabInNewWindow(args) {
    let url = args.value;

    if (typeof url === 'number') {
        url = await chrome.tabs.get(args.value).then(tab => tab.url);
    }

    return await chrome.windows.create({
        focused: true,
        incognito: args.incognito,
        state: await getCurrentWindow().then(window => {
            return window.state;
        }),
        url: url,
    }).then(window => window);
}

function dispatchOpenEvent(tabs)
{
    document.dispatchEvent(new CustomEvent('OpenCommandPalette', {
        detail: {
            tabs: tabs.map(tab => ({
                label: tab.title,
                url: tab.url,
                value: tab.id,
            })),
        }
    }));
}

async function getActiveTabId() {
    return await chrome.tabs.query({
        active: true,
        currentWindow: true
    }).then(tabs => tabs[0]?.id);
}

async function getCurrentWindow() {
    return chrome.windows.getCurrent();
}

async function handleChangeActiveTab(args) {
    if (args.createWindow) {
        return createTabInNewWindow(args);
    }

    chrome.tabs.get(args.value, tab => {
        chrome.windows.update(tab.windowId, {
            focused: true,
        });

        chrome.tabs.update(tab.id, {
            active: true,
        });
    });
}

function handleClearHistory() {
    chrome.tabs.create({
        url: 'chrome://settings/clearBrowserData',
    });
}

function handleCloseTab(args) {
    chrome.tabs.remove(args.value);
}

function handleOpenDownloads() {
    chrome.tabs.create({
        url: 'chrome://downloads',
    });
}

function handleOpenExtensions() {
    chrome.tabs.create({
        url: 'chrome://extensions',
    });
}

function handleOpenHistory() {
    chrome.tabs.create({
        url: 'chrome://history',
    });
}

function handleOpenSettings() {
    chrome.tabs.create({
        url: 'chrome://settings',
    });
}

function handleOpenTab(args) {
    if (args.value.match(/https?:\/\//) === null) {
        args.value = `http://${args.value}`;
    }

    if (args.createWindow) {
        return createTabInNewWindow(args);
    }

    chrome.tabs.create({
        url: args.value,
    });
}

function handleSearch(args) {
    if (args.createWindow) {
        if (args.incognito) {
            return createTabInNewWindow({
                ...args,
                value: `https://google.com/search?q=${args.value}`,
            });
        }

        return createTabInNewWindow(args).then(window => {
            chrome.tabs.getCurrent().then(tab => {
                chrome.search.query({
                    text: args.value,
                });
            });
        });
    }

    chrome.search.query({
        disposition: "NEW_TAB",
        text: args.value,
    });
}

function injectFiles(target) {
    chrome.scripting.insertCSS({
        target: target,
        files: [
            'dist/app.css',
        ],
    });

    chrome.scripting.executeScript({
        target: target,
        files: [
            'dist/app.js',
        ],
    }, _ => {
        sendOpenEvent(target);
    });
}

function loaded() {
    return document.querySelector('#chrome-command-palette') !== null;
}

function sendOpenEvent(target) {
    chrome.tabs.query({
        active: false,
    }).then(tabs => {
        chrome.scripting.executeScript({
            target: target,
            func: dispatchOpenEvent,
            args: [tabs],
        });
    });
}
