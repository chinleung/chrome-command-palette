console.log('Loaded app.js');

import App from './Components/App.vue';
import { createApp } from 'vue';

const id = 'chrome-command-palette';

document.body.insertAdjacentHTML('afterBegin', `<div id="${id}"></div>`);

createApp(App).mount(`#${id}`);

console.log('Finished running app.js');
