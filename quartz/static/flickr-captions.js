const applyCaptionStyle = () => {
  document.querySelectorAll('.flickr-embed-frame').forEach(iframe => {
    const iframeContainer = iframe.closest('p');
    const captionContainer = iframeContainer?.nextElementSibling;

    if (
      captionContainer?.tagName === 'P' &&
      captionContainer.childElementCount === 1 &&
      captionContainer.firstElementChild?.tagName === 'EM'
    ) {
      captionContainer.classList.add('flickr-caption-style');
    }
  });
};


// Run once in case some embeds are already loaded
applyCaptionStyle();

// Observe DOM for lazy-loaded Flickr iframes
const observer = new MutationObserver(() => {
  applyCaptionStyle();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});