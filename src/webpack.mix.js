const mix = require('laravel-mix');

mix.setPublicPath('../')
    .js('js/app.js', 'dist/app.js')
    .vue()
    .postCss('css/app.css', 'dist/app.css', [
        require('postcss-import'),
        require('@tailwindcss/nesting'),
        require('tailwindcss'),
        require('autoprefixer'),
    ])
    .options({
        manifest: false,
    });
