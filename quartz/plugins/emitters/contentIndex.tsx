import { GlobalConfiguration } from "../../cfg"
import { getDate } from "../../components/Date"
import { escapeHTML } from "../../util/escape"
import { FilePath, FullSlug, SimpleSlug, joinSegments, simplifySlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { toHtml } from "hast-util-to-html"
import { write } from "./helpers"
import { emailComment } from "../../util/comment"
import { formatInternalLinks } from "./formatInternalLinks"
import chalk from "chalk"
import { renderTranscludes } from "../../components/renderPage"

export type ContentIndexMap = Map<FullSlug, ContentDetails>
export type ContentDetails = {
  slug: FullSlug
  filePath: FilePath
  title: string
  links: SimpleSlug[]
  tags: string[]
  content: string
  richContent?: string
  date?: Date
  description?: string,
  uri?: string
}

interface Options {
  enableSiteMap: boolean
  enableRSS: boolean
  rssLimit?: number
  rssFullHtml: boolean
  rssSlug: string
  includeEmptyFiles: boolean
}

const defaultOptions: Options = {
  enableSiteMap: true,
  enableRSS: true,
  rssLimit: 10,
  rssFullHtml: false,
  rssSlug: "index",
  includeEmptyFiles: true,
}

function generateSiteMap(cfg: GlobalConfiguration, idx: ContentIndexMap): string {
  const base = cfg.baseUrl ?? ""
  const createURLEntry = (slug: SimpleSlug, content: ContentDetails): string => `<url>
    <loc>https://${joinSegments(base, encodeURI(slug))}</loc>
    ${content.date && `<lastmod>${content.date.toISOString()}</lastmod>`}
  </url>`
  const urls = Array.from(idx)
    .map(([slug, content]) => createURLEntry(simplifySlug(slug), content))
    .join("")
  return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>`
}

function generateRSSFeed(
    cfg: GlobalConfiguration, 
    idx: ContentIndexMap, 
    title: string,
    link: string,
    description: string,
    feedName: string,
    folder: string,
    tag: string,
    image: string,
    limit?: number): string 
  {
  const base = cfg.baseUrl ?? ""

  const createURLEntry = (slug: SimpleSlug, content: ContentDetails): string => {
    const inviteComment = `<p><a href="${emailComment(content.title)}">Email a comment</a></p>`;
    //const description = content.richContent ? `${content.richContent}${inviteComment}` : `${content.description}${inviteComment}`;
    const description = content.richContent
      ? `<![CDATA[${content.richContent}${inviteComment}]]>`
      : `<![CDATA[${content.description}${inviteComment}]]>`;

    // DO NOT use the filename as a guid in RSS. If the name every changes, then RSS readers will pick up
    // the old file as a new file becuase Quartz uses the filename to create the GUID.
    // The GUID should be immutable from first publication. From 8 February 2025, I'm using tag: but prior
    // to that I have published items using URL as GUID. My Obsidian vault now has a URI for all that is
    // consistent so title changes or file moves, won't cause a future problem.
    let guid = ""
    if (content.uri !== undefined ) {
      if (content.uri.startsWith("tag:") ) {
        guid = content.uri
      } else {
        guid = `https://${joinSegments(base, encodeURI(slug))}`
      }
    } else {
      console.error(chalk.red(`\nRSS entry missing URI: ${content.title}`));
      process.exit(1)
    }

    return `<item>
      <title>${escapeHTML(content.title)}</title>
      <link>https://${joinSegments(base, encodeURI(slug))}</link>
      <guid isPermaLink="false">${guid}</guid>
      <description>${description}</description>
      <pubDate>${content.date?.toUTCString()}</pubDate>
    </item>`
  }

  const items = Array.from(idx)
    .filter(([slug,content]) => slug.startsWith(`${folder}`) && content.tags?.includes(`${tag}`))
    .sort(([_, f1], [__, f2]) => {
      if (f1.date && f2.date) {
        return f2.date.getTime() - f1.date.getTime()
      } else if (f1.date && !f2.date) {
        return -1
      } else if (!f1.date && f2.date) {
        return 1
      }

      return f1.title.localeCompare(f2.title)
    })
    .map(([slug, content]) => createURLEntry(simplifySlug(slug), content))
    .slice(0, limit ?? idx.size)
    .join("")

    const year = new Date().getFullYear()

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escapeHTML(title)}</title>
      <link>${link}</link>
      <description>${description}</description>
      <copyright>© David C. Buchan 2002-${year}</copyright>
      <generator>Quartz -- quartz.jzhao.xyz</generator>
      <managingEditor>qg.info@mail.buchan.org (David Buchan)</managingEditor>
      <webMaster>qg.info@mail.buchan.org (David Buchan)</webMaster>
      <atom:link href="https://quantumgardener.info/${feedName}.xml" rel="self" type="application/rss+xml" />
      <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
            <docs>https://www.rssboard.org/rss-specification</docs>
      <image>
        <url>https://${base}/static/${image}</url>
        <title>${escapeHTML(title)}</title>
        <link>${link}</link>
      </image>
      ${items}
    </channel>
  </rss>`
}

export const ContentIndex: QuartzEmitterPlugin<Partial<Options>> = (opts) => {
  opts = { ...defaultOptions, ...opts }
  return {
    name: "ContentIndex",
    async *emit(ctx, content) {
      const cfg = ctx.cfg.configuration
      const allFiles = content.map((c) => c[1].data)
      const linkIndex: ContentIndexMap = new Map()
      for (const [tree, file] of content) {
        const slug = file.data.slug!
        const date = getDate(ctx.cfg.configuration, file.data) ?? new Date()

        // Clone the HTML AST so we don't mutate the original
        const htmlAst = structuredClone(file.data.htmlAst!)

        // Build a minimal QuartzComponentProps object
        const componentData = {
          allFiles,
          cfg,
          fileData: file.data,
          ctx: {
            cfg,            // required field
            buildId: "",    // unused
            argv: {},       // unused
            allSlugs: [],   // unused
            allFiles,       // unused
            externalResources: {}, // unused
          },
          externalResources: {},
          children: [],
          tree: htmlAst,
          displayClass: undefined,
        }

        // Expand transclusions
        renderTranscludes(
          htmlAst,
          cfg,
          file.data.slug!,
          componentData,
          new Set()
        )

        formatInternalLinks(htmlAst, file, allFiles)

        // Convert to HTML
        const html = toHtml(htmlAst, { allowDangerousHtml: true })



        if (opts?.includeEmptyFiles || (file.data.text && file.data.text !== "")) {
          linkIndex.set(slug, {
            slug,
            filePath: file.data.relativePath!,
            title: file.data.frontmatter?.title!,
            links: file.data.links ?? [],
            tags: file.data.frontmatter?.tags ?? [],
            content: file.data.text ?? "",
            richContent: opts?.rssFullHtml ? html : undefined,
            date: date,
            description: file.data.description ?? "",
            uri: file.data.frontmatter?.uri,
          })
        }
      }

      if (opts?.enableSiteMap) {
        yield write({
          ctx,
          content: generateSiteMap(cfg, linkIndex),
          slug: "sitemap" as FullSlug,
          ext: ".xml",
        })
      }

      if (opts?.enableRSS) {
        const base = cfg.baseUrl ?? ""
        yield write({
          ctx,
          content: generateRSSFeed(
            cfg, 
            linkIndex, 
            cfg.pageTitle,
            `https://${base}`,
            "A digital garden cultivating the possibilities of life.",
            "index",
            "notes",
            "blog",
            "qg-image-500.jpg",
            opts.rssLimit
          ),
          slug: (opts?.rssSlug ?? "index") as FullSlug,
          ext: ".xml",
        })

        yield write({
          ctx,
          content: generateRSSFeed(
            cfg, 
            linkIndex, 
            "Commander's Log",
            `https://${base}/commander's-log/`,
            "The log of Commander Q4NTUM",
            "cmdrs-log",
            "commander's-log",
            "cmdrs-log",
            "cmdr-q4ntum.jpg",
            opts.rssLimit
          ),
          slug: ("cmdrs-log") as FullSlug,
          ext: ".xml",
        })
      }

      const fp = joinSegments("static", "contentIndex") as FullSlug
      const simplifiedIndex = Object.fromEntries(
        Array.from(linkIndex).map(([slug, content]) => {
          // remove description and from content index as nothing downstream
          // actually uses it. we only keep it in the index as we need it
          // for the RSS feed
          delete content.description
          delete content.date
          return [slug, content]
        }),
      )

      yield write({
        ctx,
        content: JSON.stringify(simplifiedIndex),
        slug: fp,
        ext: ".json",
      })
    },
    externalResources: (ctx) => {
      if (opts?.enableRSS) {
        return {
          additionalHead: [
            <link
              rel="alternate"
              type="application/rss+xml"
              title="RSS Feed"
              href={`https://${ctx.cfg.configuration.baseUrl}/index.xml`}
            />,
            <link
              rel="alternate"
              type="application/rss+xml"
              title="Commander's Log"
              href={`https://${ctx.cfg.configuration.baseUrl}/cmdrs-log.xml`}
            />,
          ],
        }
      }
    },
  }
}
