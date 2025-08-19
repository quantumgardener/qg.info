import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)
  return (
    <div>
      <h2 class={classNames(displayClass, "page-title")}>
        <a href={baseDir}>{title}</a>
      </h2>
      <p class="subtitle">Life learning, for life</p>
    </div>
  )
}

PageTitle.css = `
.page-title {
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}

@media (max-width: 600px) {
  .page-title {
    font-size: 1.4rem;
  }
}
`;


export default (() => PageTitle) satisfies QuartzComponentConstructor
