import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/footer.scss"

interface Options {
  links: Record<string, string>
}

export default ((opts?: Options) => {
  const Footer: QuartzComponent = ({ allFiles, displayClass, cfg }: QuartzComponentProps) => {
    const today: Date = new Date()
    const localYear = today.toLocaleString(cfg.locale, {
      timeZone: cfg.timezone,
      year: 'numeric',
    })
    const localToday = today.toLocaleString(cfg.locale, {
      timeZone: cfg.timezone,
      dateStyle: "long",
      timeStyle: "short"
    })
    return (
      <footer class={`${displayClass ?? ""}`}>
        
        <hr />
        <ul>
          <li><a href="/notes/subscribe"><i class="nf nf-fa-square_rss"></i> Subscribe</a></li>
          <li><a href="/notes/about"><i class="nf nf-fa-address_card"></i> About</a></li>
          <li>|</li>
          <li><a href="/notes/site-privacy"><i class="nf nf-fa-lock"></i> Privacy</a></li>
          <li><a href="/notes/ai-policy"><i class="nf nf-md-brain"></i> AI Policy</a></li>
          <li>|</li>
          <li><a href="https://aus.social/@dcbuchan"><i class="nf nf-fa-mastodon"></i> Mastodon</a></li>
          <li><a href="https://github.com/quantumgardener"><i class="nf nf-fa-github"></i> Github</a></li>
        </ul>
        <div class="site-metadata">
          &copy; David C. Buchan 2002&ndash;{localYear}. Last update: {localToday}. <a href="/notes">Recently updated notes</a>.<br/>
          {allFiles.length} site pages. <a href="/notes/colophon">Colophon</a>. 
          <a rel="me" href="https://aus.social/@dcbuchan"></a> <span class="tinylytics_hits"></span> <a href="/notes/site-visits">total unique visits</a>.
        </div>
      </footer>
    )
  }

  Footer.css = style
  return Footer
}) satisfies QuartzComponentConstructor
