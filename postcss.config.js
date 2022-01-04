const purgecss = require('@fullhuman/postcss-purgecss')({
    content: ['./hugo_stats.json', './**/*.html', './assets/js/flickity.min.js', './assets/js/parallax.js', './assets/js/scripts.js'],
    //safelist: ['flickity-slider', 'slider', 'slides', 'slide', 'is-selected', 'flickity-prev-next-button', 'flickity-page-dots', 'dot', 'flickity-enabled', 'is-draggable', 'flickity-viewport', 'flickity-slider' ]
    // safelist: ['pre', 'figure', 'highlight'],
    extractors: [
        {
          extractor: content => {
            let els = JSON.parse(content).htmlElements;
            return els.tags.concat(els.classes, els.ids);
            },
          extensions: ['json']
        }
      ]
});

module.exports = {
     plugins: [
         ...(process.env.HUGO_ENVIRONMENT === 'production' ? [ purgecss ] : [])
     ]
 };