function setupToc() {
  for (const toc of document.getElementsByClassName("sitetoc")) {
    const button = toc.querySelector(".sitetoc-header")
    const content = toc.querySelector(".sitetoc-content")
    if (!button || !content) return
    button.addEventListener("click", toggleToc)
    window.addCleanup(() => button.removeEventListener("click", toggleToc))
  }
}

document.addEventListener("nav", () => {
  setupToc()
})
