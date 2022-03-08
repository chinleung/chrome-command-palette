let activeTabId = null;

chrome.tabs.onActivated.addListener(info => {
    activeTabId = info.tabId;
});

chrome.commands.onCommand.addListener(async command => {
    if (command !== 'toggle-palette') {
        return;
    }

    await updateActiveTabId();

    const target = {
        tabId: activeTabId,
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

            case 'close-tab':
                return handleCloseTab(message);

            case 'open-tab':
                return handleOpenTab(message);

            case 'search':
                return handleSearch(message);

            default: console.error(`Unsupported action ${message.action}!`);
        }
    });
});

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

function handleChangeActiveTab(args) {
    chrome.tabs.get(args.value, tab => {
        chrome.windows.update(tab.windowId, {
            focused: true,
        });

        chrome.tabs.update(tab.id, {
            active: true,
        });
    });
}

function handleCloseTab(args) {
    chrome.tabs.remove(args.value);
}

function handleOpenTab(args) {
    chrome.tabs.create({
        url: args.value,
    });
}

function handleSearch(args) {
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

async function updateActiveTabId() {
    if (activeTabId !== null) {
        return;
    }

    await chrome.tabs.query({
        active: true,
        currentWindow: true
    }).then(tabs => {
        activeTabId = tabs[0]?.id;
    });
}
