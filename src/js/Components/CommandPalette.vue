<script setup>
import { computed, ref } from 'vue';
import { SearchIcon } from '@heroicons/vue/solid';
import {
    ClockIcon,
    DocumentIcon,
    DownloadIcon,
    LinkIcon,
    PuzzleIcon,
    TrashIcon
} from '@heroicons/vue/outline';
import {
    Combobox,
    ComboboxInput,
    ComboboxOptions,
    ComboboxOption,
    Dialog,
    DialogOverlay,
    TransitionChild,
    TransitionRoot,
} from '@headlessui/vue';

const query = ref('');

const queryIsUrl = computed(_ => {
    if (query.value.match(/[^\.]+\.[^\.]+/) !== null) {
        return true;
    }

    return query.value.match(/https?:\/\//) !== null;
});

const wildcardItem = computed(_ => {
    const args = {};

    if (queryIsUrl.value) {
        args.action = 'open-tab';
        args.description = `Navigate to ${query.value}`;
        args.icon = LinkIcon;
        args.label = 'Open new tab';
    }

    return {
        action: 'search',
        description: `Search for "${query.value}"`,
        icon: SearchIcon,
        label: 'Start new search',
        color: 'bg-blue-500',
        shortcuts: [
            'N',
        ],
        value: query.value,
        ...args,
    };
});

document.addEventListener('OpenCommandPalette', event => {
    items.value = [
        ...event.detail.tabs.map(tab => ({
            ...tab,
            action: 'change-active-tab',
            color: 'bg-indigo-500',
            icon: DocumentIcon,
            description: 'Change active tab',
            shortcuts: [
                'N',
                'X',
            ],
        })),
        {
            action: 'clear-history',
            color: 'bg-gray-500',
            icon: TrashIcon,
            label: 'Clear History',
            description: 'Open the prompt to clear the browser history',
        },
        {
            action: 'open-downloads',
            color: 'bg-gray-500',
            icon: DownloadIcon,
            label: 'Downloads',
            description: 'Open the downloads history',
        },
        {
            action: 'open-extensions',
            color: 'bg-gray-500',
            icon: PuzzleIcon,
            label: 'Extensions',
            description: 'Open the list of extensions',
        },
        {
            action: 'open-history',
            color: 'bg-gray-500',
            icon: ClockIcon,
            label: 'History',
            description: 'Open the browser history',
        },
        wildcardItem,
    ];

    open.value = true;
});

const open = ref(false);
const items = ref([]);
const selectedIndex = ref(null);
const selectedItem = ref(null);
const availableShortcuts = ref([]);

const shortcuts = [
    {
        key: 'N',
        callback: createWindow,
        description: 'Open in new window',
        shift: 'Open in new incognito window',
    },
    {
        key: 'X',
        callback: closeSelection,
        description: 'Close tab'
    }
];

const filteredItems = computed(_ => {
    if (query.value === '') {
        return [];
    }

    const search = query.value.toLowerCase();

    return items.value.map(item => {
        if (item.constructor.name === 'ComputedRefImpl') {
            return item.value;
        }

        return item;
    }).filter(item => {
        return item.label.toLowerCase().includes(search)
            || item.url?.toLowerCase()?.includes(search)
            || item.description.toLowerCase()?.includes(search);
    })
});

function closeSelection() {
    const item = getSelectedItem();

    if (item?.action !== 'change-active-tab') {
        return;
    }

    const itemIndex = items.value.findIndex(element => element == item);

    if (itemIndex === -1) {
        return;
    }

    postMessage({
        action: 'close-tab',
        value: item.value,
    });

    items.value.splice(itemIndex, 1);
}

function createWindow(event) {
    const item = getSelectedItem();

    onSelect(item, {
        createWindow: true,
        incognito: event.shiftKey,
    });
}

function getSelectedItem() {
    if (! selectedIndex.value) {
        return;
    }

    const index = parseInt(selectedIndex.value.getAttribute('value'));

    if (isNaN(index)) {
        return;
    }

    return filteredItems.value[index];
}

function onKeyDown(event) {
    if (! event.ctrlKey) {
        return;
    }

    const key = event.key.toUpperCase();

    const shortcut = shortcuts.find(shortcut => shortcut.key == key);

    if (! shortcut) {
        return;
    }

    shortcut.callback(event);
}

function onKeyUp(event) {
    refreshAvailableShortcuts();
}

function onChangeQuery(event) {
    query.value = event.target.value;

    if (filteredItems.value.length === 1) {
        selectedItem.value = filteredItems.value[0];
    }
}

function onSelect(item, params = {}) {
    postMessage({
        action: item.action,
        value: item.value,
        ...params,
    });

    open.value = false;
}

function postMessage(payload) {
    chrome.runtime.connect().postMessage(payload);
}

function refreshAvailableShortcuts() {
    const item = getSelectedItem();

    if (! item?.shortcuts) {
        availableShortcuts.value = [];

        return;
    }

    availableShortcuts.value = shortcuts.filter(shortcut => {
        return item.shortcuts.indexOf(shortcut.key) !== -1;
    });
}
</script>

<template>
    <TransitionRoot :show="open" as="template" @after-leave="query = ''">
    <Dialog as="div" class="fixed inset-x-0 p-4 overflow-y-auto inset-y-10 sm:p-6 md:p-20" @close="open = false" style="z-index: 9999;">
    <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
    <DialogOverlay class="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
    </TransitionChild>

    <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
    <Combobox v-model="selectedItem" v-slot="{ activeIndex }" as="div" class="max-w-xl mx-auto overflow-hidden bg-white shadow-2xl transform divide-y divide-gray-100 rounded-xl ring-1 ring-black ring-opacity-5 transition-all" @update:modelValue="onSelect">
    <div class="relative">
        <SearchIcon class="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" aria-hidden="true" />
        <ComboboxInput @change="onChangeQuery" @keydown="onKeyDown" @keyup="onKeyUp" class="w-full h-12 pr-4 text-gray-800 placeholder-gray-400 bg-transparent border-0 pl-11 focus:ring-0 sm:text-sm" placeholder="Search..." />
        <input ref="selectedIndex" :value="activeIndex" type="hidden" />
    </div>

    <ComboboxOptions v-if="filteredItems.length > 0" static class="p-3 overflow-x-hidden overflow-y-auto max-h-96 scroll-py-3">
    <ComboboxOption v-for="item in filteredItems" :key="item.id" :value="item" as="template" v-slot="{ active }">
    <li :class="['flex cursor-default select-none rounded-xl p-3', active && 'bg-gray-100']">
        <div :class="['flex h-10 w-10 flex-none items-center justify-center rounded-lg', item.color]">
            <component :is="item.icon" class="w-6 h-6 text-white" aria-hidden="true" />
        </div>
        <div class="flex-auto ml-4">
            <p :class="['text-sm font-medium', active ? 'text-gray-900' : 'text-gray-700']">
                {{ item.label }}
            </p>
            <p :class="['text-sm', active ? 'text-gray-700' : 'text-gray-500']">
                {{ item.description }}
            </p>
        </div>
    </li>
    </ComboboxOption>
    </ComboboxOptions>
    <div v-if="availableShortcuts.length" class="flex flex-col bg-gray-50 py-2.5 px-4 text-xs text-gray-700 space-y-2">
        <div class="font-bold">Shortcuts</div>
        <div v-for="shortcut in availableShortcuts" :key="`shortcut-${shortcut.key}`">
            <div class="flex justify-between">
                <div class="flex">
                    <kbd class="flex items-center justify-center w-10 h-5 mr-1 font-semibold text-gray-900 bg-white border border-gray-400 rounded sm:mr-2">CTRL</kbd>
                    &plus;
                    <kbd class="flex items-center justify-center w-5 h-5 mx-1 font-semibold text-gray-900 bg-white border border-gray-400 rounded sm:mx-2">{{ shortcut.key }}</kbd>
                </div>
                <div>{{ shortcut.description }}</div>
            </div>
            <div v-if="shortcut.shift" class="flex justify-between mt-2">
                <div class="flex">
                    <kbd class="flex items-center justify-center w-10 h-5 mr-1 font-semibold text-gray-900 bg-white border border-gray-400 rounded sm:mr-2">CTRL</kbd>
                    &plus;
                    <kbd class="flex items-center justify-center w-12 h-5 mx-1 font-semibold text-gray-900 bg-white border border-gray-400 rounded sm:mx-2">SHIFT</kbd>
                    &plus;
                    <kbd class="flex items-center justify-center w-5 h-5 mx-1 font-semibold text-gray-900 bg-white border border-gray-400 rounded sm:mx-2">{{ shortcut.key }}</kbd>
                </div>
                <div>{{ shortcut.shift }}</div>
            </div>
        </div>
      </div>

    </Combobox>
    </TransitionChild>
    </Dialog>
    </TransitionRoot>
</template>
