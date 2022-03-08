const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
    content: [
        './js/**/*.vue',
    ],
    plugins: [
        require('@tailwindcss/forms')
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter var', ...defaultTheme.fontFamily.sans]
            },
        },
    },
};
