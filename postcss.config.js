const purgecss = require('@fullhuman/postcss-purgecss')({
    content: ['./**/*.html', './static/js/flickity.min.js', './static/js/parallax.js', './static/js/scripts.js'],
    //safelist: ['flickity-slider', 'slider', 'slides', 'slide', 'is-selected', 'flickity-prev-next-button', 'flickity-page-dots', 'dot', 'flickity-enabled', 'is-draggable', 'flickity-viewport', 'flickity-slider' ]
});

module.exports = {
     plugins: [
         ...(process.env.HUGO_ENVIRONMENT === 'production' ? [ purgecss ] : [])
     ]
 };