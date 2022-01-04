const purgecss = require('@fullhuman/postcss-purgecss')({
    content: ['./**/*.html', './assets/js/flickity.min.js', './assets/js/parallax.js', './assets/js/scripts.js'],
    //safelist: ['flickity-slider', 'slider', 'slides', 'slide', 'is-selected', 'flickity-prev-next-button', 'flickity-page-dots', 'dot', 'flickity-enabled', 'is-draggable', 'flickity-viewport', 'flickity-slider' ]
});

module.exports = {
     plugins: [
         ...(process.env.HUGO_ENVIRONMENT === 'production' ? [ purgecss ] : [])
     ]
 };