const purgecss = require('@fullhuman/postcss-purgecss')({
    content: ['./**/*.html', './**/*.js'],
    //safelist: ['flickity-slider', 'slider', 'slides', 'slide', 'is-selected', 'flickity-prev-next-button', 'flickity-page-dots', 'dot', 'flickity-enabled', 'is-draggable', 'flickity-viewport', 'flickity-slider' ]
});

module.exports = {
     plugins: [
         ...(process.env.HUGO_ENVIRONMENT === 'production' ? [ purgecss ] : [])
     ]
 };