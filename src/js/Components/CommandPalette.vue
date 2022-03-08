<script setup>
import { computed, ref } from 'vue';
import { SearchIcon } from '@heroicons/vue/solid';
import { DocumentIcon, LinkIcon } from '@heroicons/vue/outline';
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

const notFoundItem = computed(_ => {
    if (queryIsUrl.value) {
        return {
            action: 'open-tab',
            color: 'bg-blue-500',
            description: `Navigate to ${query.value}`,
            icon: LinkIcon,
            label: 'Open new tab',
            value: query.value,
            wildcard: true,
        };
    }

    return {
        action: 'search',
        color: 'bg-blue-500',
        description: `Search for "${query.value}"`,
        icon: SearchIcon,
        label: 'Start new search',
        value: query.value,
        wildcard: true,
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
        })),
        notFoundItem,
    ];

    open.value = true;
});

const open = ref(false);
const items = ref([]);
const selectedIndex = ref(null);
const selectedItem = ref(null);

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
        return item.wildcard
            || item.label.toLowerCase().includes(search)
            || item.url?.toLowerCase()?.includes(search);
    })
});

function closeSelection() {
    const index = parseInt(selectedIndex.value.getAttribute('value'));

    if (isNaN(index)) {
        return;
    }

    const item = filteredItems.value[index];

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

function handleControlShortcuts(event) {
}

function onKeyDown(event) {
    if (! event.ctrlKey) {
        return;
    }

    switch (event.key) {
        case 'x':
            return closeSelection();
    }
}

function onChangeQuery(event) {
    query.value = event.target.value;

    if (filteredItems.value.length === 1) {
        selectedItem.value = filteredItems.value[0];
    }
}

function onSelect(item) {
    postMessage({
        action: item.action,
        value: item.value,
    });

    open.value = false;
}

function postMessage(payload) {
    chrome.runtime.connect().postMessage(payload);
}
</script>

<template>
    <TransitionRoot :show="open" as="template" @after-leave="query = ''">
    <Dialog as="div" class="fixed inset-x-0 z-50 p-4 overflow-y-auto inset-y-10 sm:p-6 md:p-20" @close="open = false">
    <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
    <DialogOverlay class="fixed inset-0 bg-gray-500 bg-opacity-25 transition-opacity" />
    </TransitionChild>

    <TransitionChild as="template" enter="ease-out duration-300" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
    <Combobox v-model="selectedItem" v-slot="{ activeIndex }" as="div" class="max-w-xl mx-auto overflow-hidden bg-white shadow-2xl transform divide-y divide-gray-100 rounded-xl ring-1 ring-black ring-opacity-5 transition-all" @update:modelValue="onSelect">
    <div class="relative">
        <SearchIcon class="pointer-events-none absolute top-3.5 left-4 h-5 w-5 text-gray-400" aria-hidden="true" />
        <ComboboxInput @change="onChangeQuery" @keydown="onKeyDown" class="w-full h-12 pr-4 text-gray-800 placeholder-gray-400 bg-transparent border-0 pl-11 focus:ring-0 sm:text-sm" placeholder="Search..." />
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
    </Combobox>
    </TransitionChild>
    </Dialog>
    </TransitionRoot>
</template>
