import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { ProcessedContent, QuartzPluginData, defaultProcessedContent } from "../vfile"
import { FullPageLayout } from "../../cfg"
import { FullSlug, getAllSegmentPrefixes, joinSegments, pathToRoot } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import { KeywordContent } from "../../components"
import { write } from "./helpers"
import { i18n, TRANSLATIONS } from "../../i18n"
import { BuildCtx } from "../../util/ctx"
import { StaticResources } from "../../util/resources"

interface KeywordPageOptions extends FullPageLayout {
  sort?: (f1: QuartzPluginData, f2: QuartzPluginData) => number
}

function computeKeywordInfo(
  allFiles: QuartzPluginData[],
  content: ProcessedContent[],
  locale: keyof typeof TRANSLATIONS,
): [Set<string>, Record<string, ProcessedContent>] {
  const keywords: Set<string> = new Set(
    allFiles.flatMap((data) => data.frontmatter?.keywords ?? []).flatMap(getAllSegmentPrefixes),
  )

  // add base keyword
  keywords.add("index")

  const keywordDescriptions: Record<string, ProcessedContent> = Object.fromEntries(
    [...keywords].map((keyword) => {
      const title =
        keyword === "index"
          ? i18n(locale).pages.keywordContent.keywordIndex
          : `${i18n(locale).pages.keywordContent.keyword}: ${keyword}`
      return [
        keyword,
        defaultProcessedContent({
          slug: joinSegments("keywords", keyword) as FullSlug,
          frontmatter: { title, keywords: [] },
        }),
      ]
    }),
  )

  // Update with actual content if available
  for (const [tree, file] of content) {
    const slug = file.data.slug!
    if (slug.startsWith("keywords/")) {
      const keyword = slug.slice("keywords/".length)
      if (keywords.has(keyword)) {
        keywordDescriptions[keyword] = [tree, file]
        if (file.data.frontmatter?.title === keyword) {
          file.data.frontmatter.title = `${i18n(locale).pages.keywordContent.keyword}: ${keyword}`
        }
      }
    }
  }

  return [keywords, keywordDescriptions]
}

async function processKeywordPage(
  ctx: BuildCtx,
  keyword: string,
  keywordContent: ProcessedContent,
  allFiles: QuartzPluginData[],
  opts: FullPageLayout,
  resources: StaticResources,
) {
  const slug = joinSegments("keywords", keyword) as FullSlug
  const [tree, file] = keywordContent
  const cfg = ctx.cfg.configuration
  const externalResources = pageResources(pathToRoot(slug), resources)
  const componentData: QuartzComponentProps = {
    ctx,
    fileData: file.data,
    externalResources,
    cfg,
    children: [],
    tree,
    allFiles,
  }

  const content = renderPage(cfg, slug, componentData, opts, externalResources)
  return write({
    ctx,
    content,
    slug: file.data.slug!,
    ext: ".html",
  })
}

export const KeywordPage: QuartzEmitterPlugin<Partial<KeywordPageOptions>> = (userOpts) => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    ...defaultListPageLayout,
    pageBody: KeywordContent({ sort: userOpts?.sort }),
    ...userOpts,
  }

  const { head: Head, header, beforeBody, pageBody, afterBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "KeywordPage",
    getQuartzComponents() {
      return [
        Head,
        Header,
        Body,
        ...header,
        ...beforeBody,
        pageBody,
        ...afterBody,
        ...left,
        ...right,
        Footer,
      ]
    },
    async *emit(ctx, content, resources) {
      const allFiles = content.map((c) => c[1].data)
      const cfg = ctx.cfg.configuration
      const [keywords, keywordDescriptions] = computeKeywordInfo(allFiles, content, cfg.locale)

      for (const keyword of keywords) {
        yield processKeywordPage(ctx, keyword, keywordDescriptions[keyword], allFiles, opts, resources)
      }
    },
    async *partialEmit(ctx, content, resources, changeEvents) {
      const allFiles = content.map((c) => c[1].data)
      const cfg = ctx.cfg.configuration

      // Find all keywords that need to be updated based on changed files
      const affectedTags: Set<string> = new Set()
      for (const changeEvent of changeEvents) {
        if (!changeEvent.file) continue
        const slug = changeEvent.file.data.slug!

        // If it's a keyword page itself that changed
        if (slug.startsWith("keywords/")) {
          const keyword = slug.slice("keywords/".length)
          affectedTags.add(keyword)
        }

        // If a file with keywords changed, we need to update those keyword pages
        const fileTags = changeEvent.file.data.frontmatter?.keywords ?? []
        fileTags.flatMap(getAllSegmentPrefixes).forEach((keyword) => affectedTags.add(keyword))

        // Always update the index keyword page if any file changes
        affectedTags.add("index")
      }

      // If there are affected keywords, rebuild their pages
      if (affectedTags.size > 0) {
        // We still need to compute all keywords because keyword pages show all keywords
        const [_keywords, keywordDescriptions] = computeKeywordInfo(allFiles, content, cfg.locale)

        for (const keyword of affectedTags) {
          if (keywordDescriptions[keyword]) {
            yield processKeywordPage(ctx, keyword, keywordDescriptions[keyword], allFiles, opts, resources)
          }
        }
      }
    },
  }
}
