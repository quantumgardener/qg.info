function initializeJustifiedGallery() {
    var gallery = $('.my-gallery');
    if (gallery.length) {
      imagesLoaded(gallery, function() {
        gallery.justifiedGallery({
          rowHeight: 200,
          lastRow: 'nojustify',
          margins: 5,
          randomize: false,
          sizeRangeSuffixes: {
            100 : '_t', // used with images which are less than 100px on the longest side
            240 : '_m', // used with images which are between 100px and 240px on the longest side
            320 : '_n', // ...
            500 : '',
            640 : '_z',
            800 : '_c',
            1024: '_b',
            1600: '_h' // used with images that are more than 640px on the longest side
          }
        }).on('jg.complete', function() {
          $("#please-wait").fadeOut(); // Fade out after the gallery is initialized
        });
      });
    }
}

document.addEventListener('DOMContentLoaded', initializeJustifiedGallery);