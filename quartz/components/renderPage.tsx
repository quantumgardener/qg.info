import { render } from "preact-render-to-string"
import { QuartzComponent, QuartzComponentProps } from "./types"
import HeaderConstructor from "./Header"
import BodyConstructor from "./Body"
import { JSResourceToScriptElement, StaticResources } from "../util/resources"
import { FullSlug, RelativeURL, joinSegments, normalizeHastElement, resolveRelative } from "../util/path"
import { clone } from "../util/clone"
import { visit } from "unist-util-visit"
import { Root, Element, ElementContent } from "hast"
import { GlobalConfiguration } from "../cfg"
import { i18n } from "../i18n"
import { emailComment } from "../util/comment"
import { styleText } from "util"
import { ProcessedWebMentions } from "../util/myUtils"
import { formatDate, formatTime } from "./Date"

interface RenderComponents {
  head: QuartzComponent
  header: QuartzComponent[]
  beforeBody: QuartzComponent[]
  pageBody: QuartzComponent
  afterBody: QuartzComponent[]
  left: QuartzComponent[]
  right: QuartzComponent[]
  footer: QuartzComponent
}

const headerRegex = new RegExp(/h[1-6]/)
export function pageResources(
  baseDir: FullSlug | RelativeURL,
  staticResources: StaticResources,
): StaticResources {
  const contentIndexPath = joinSegments(baseDir, "static/contentIndex.json")
  const contentIndexScript = `const fetchData = fetch("${contentIndexPath}").then(data => data.json())`

  const resources: StaticResources = {
    css: [
      {
        content: joinSegments(baseDir, "index.css"),
      },
      ...staticResources.css,
    ],
    js: [
      {
        src: joinSegments(baseDir, "prescript.js"),
        loadTime: "beforeDOMReady",
        contentType: "external",
      },
      {
        loadTime: "beforeDOMReady",
        contentType: "inline",
        spaPreserve: true,
        script: contentIndexScript,
      },
      ...staticResources.js,
    ],
    additionalHead: staticResources.additionalHead,
  }

  resources.js.push({
    src: joinSegments(baseDir, "postscript.js"),
    loadTime: "afterDOMReady",
    moduleType: "module",
    contentType: "external",
  })

  return resources
}

function renderTranscludes(
  root: Root,
  cfg: GlobalConfiguration,
  slug: FullSlug,
  componentData: QuartzComponentProps,
  visited: Set<FullSlug>,
) {
  // process transcludes in componentData
  visit(root, "element", (node, _index, _parent) => {
    if (node.tagName === "blockquote") {
      const classNames = (node.properties?.className ?? []) as string[]
      if (classNames.includes("transclude")) {
        const inner = node.children[0] as Element
        const transcludeTarget = (inner.properties["data-slug"] ?? slug) as FullSlug
        if (visited.has(transcludeTarget)) {
          console.warn(
            styleText(
              "yellow",
              `Warning: Skipping circular transclusion: ${slug} -> ${transcludeTarget}`,
            ),
          )
          node.children = [
            {
              type: "element",
              tagName: "p",
              properties: { style: "color: var(--secondary);" },
              children: [
                {
                  type: "text",
                  value: `Circular transclusion detected: ${transcludeTarget}`,
                },
              ],
            },
          ]
          return
        }
        visited.add(transcludeTarget)

        const page = componentData.allFiles.find((f) => f.slug === transcludeTarget)
        if (!page) {
          return
        }

        let blockRef = node.properties.dataBlock as string | undefined
        if (blockRef?.startsWith("#^")) {
          // block transclude
          blockRef = blockRef.slice("#^".length)
          let blockNode = page.blocks?.[blockRef]
          if (blockNode) {
            if (blockNode.tagName === "li") {
              blockNode = {
                type: "element",
                tagName: "ul",
                properties: {},
                children: [blockNode],
              }
            }

            node.children = [
              normalizeHastElement(blockNode, slug, transcludeTarget),
              {
                type: "element",
                tagName: "a",
                properties: { href: inner.properties?.href, class: ["internal", "transclude-src"] },
                children: [
                  { type: "text", value: i18n(cfg.locale).components.transcludes.linkToOriginal },
                ],
              },
            ]
          }
        } else if (blockRef?.startsWith("#") && page.htmlAst) {
          // header transclude
          blockRef = blockRef.slice(1)
          let startIdx = undefined
          let startDepth = undefined
          let endIdx = undefined
          for (const [i, el] of page.htmlAst.children.entries()) {
            // skip non-headers
            if (!(el.type === "element" && el.tagName.match(headerRegex))) continue
            const depth = Number(el.tagName.substring(1))

            // lookin for our blockref
            if (startIdx === undefined || startDepth === undefined) {
              // skip until we find the blockref that matches
              if (el.properties?.id === blockRef) {
                startIdx = i
                startDepth = depth
              }
            } else if (depth <= startDepth) {
              // looking for new header that is same level or higher
              endIdx = i
              break
            }
          }

          if (startIdx === undefined) {
            return
          }

          node.children = [
            ...(page.htmlAst.children.slice(startIdx, endIdx) as ElementContent[]).map((child) =>
              normalizeHastElement(child as Element, slug, transcludeTarget),
            ),
            {
              type: "element",
              tagName: "a",
              properties: { href: inner.properties?.href, class: ["internal", "transclude-src"] },
              children: [
                { type: "text", value: i18n(cfg.locale).components.transcludes.linkToOriginal },
              ],
            },
          ]
        } else if (page.htmlAst) {
          // page transclude
          node.children = [
            {
              type: "element",
              tagName: "h1",
              properties: {},
              children: [
                {
                  type: "text",
                  value:
                    page.frontmatter?.title ??
                    i18n(cfg.locale).components.transcludes.transcludeOf({
                      targetSlug: page.slug!,
                    }),
                },
              ],
            },
            ...(page.htmlAst.children as ElementContent[]).map((child) =>
              normalizeHastElement(child as Element, slug, transcludeTarget),
            ),
            {
              type: "element",
              tagName: "a",
              properties: { href: inner.properties?.href, class: ["internal", "transclude-src"] },
              children: [
                { type: "text", value: i18n(cfg.locale).components.transcludes.linkToOriginal },
              ],
            },
          ]
        }
      }
    }
  })
}

export function renderPage(
  cfg: GlobalConfiguration,
  slug: FullSlug,
  componentData: QuartzComponentProps,
  components: RenderComponents,
  pageResources: StaticResources,
): string {
  // make a deep copy of the tree so we don't remove the transclusion references
  // for the file cached in contentMap in build.ts
  const root = clone(componentData.tree) as Root
  const visited = new Set<FullSlug>([slug])
  renderTranscludes(root, cfg, slug, componentData, visited)

  // set componentData.tree to the edited html that has transclusions rendered
  componentData.tree = root

  const {
    head: Head,
    header,
    beforeBody,
    pageBody: Content,
    afterBody,
    left,
    right,
    footer: Footer,
  } = components
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  const LeftComponent = (
    <div class="left sidebar">
      {left.map((BodyComponent) => (
        <BodyComponent {...componentData} />
      ))}
    </div>
  )

  const RightComponent = (
    <div class="right sidebar">
      {right.map((BodyComponent) => (
        <BodyComponent {...componentData} />
      ))}
    </div>
  )

  const lang = componentData.fileData.frontmatter?.lang ?? cfg.locale?.split("-")[0] ?? "en"
  const direction = i18n(cfg.locale).direction ?? "ltr"

  const prev = componentData.fileData.prevFile
  const next = componentData.fileData.nextFile
  const webmentions = componentData.fileData.webmentions!

  interface WebMentionsProps {
    wbm: ProcessedWebMentions
  }

  function WebmentionsLikes({wbm} : WebMentionsProps) {
    if (!wbm) {
      return null; 
    }

    if ((wbm.likes ?? 0) < 1) {
      return null
    }

    return (
      <div class="webmentionCount">
        <i class="nf nf-fa-heart"></i> {wbm.likes}
      </div>
    )
  }

  function WebmentionsReposts({wbm} : WebMentionsProps) {
    if (!wbm) {
      return null; 
    }

    if ((wbm.reposts ?? 0) < 1) {
      return null
    }

    return (
      <div class="webmentionCount">
        <i class="nf nf-fa-repeat"></i> {wbm.reposts}
      </div>
    )
  }

  function WebmentionsList({wbm} : WebMentionsProps){
    if (!wbm) {
      return null; 
    }

    if (wbm.mentions?.length == 0) {
      return null;
    }

    return (
      <div id="webmentions" class="mentions hfeed">
        {wbm.mentions?.map((wm) => (
          <div class="h-entry mention">
            <div class="author u-author h-card">
              <img src={wm["author"]["photo"]} class="photo u-photo"/>
              <a href={wm["author"]["url"]} class="name u-url p-name">{wm["author"]["name"]}</a> <a href={wm["author"]["url"]} class="url">{wm["author"]["url"]}</a>
            </div>
            <div class="e-content html">
              {wm["content"]["text"]}
            </div>
            <div class="metaline">
              <time class="dt-published" datetime={wm["wm-received"]}>
                <a href={wm["wm-source"]} class="u-url">
                  {formatDate(new Date(wm["wm-received"]),cfg.locale)}, {formatTime(new Date(wm["wm-received"]),cfg.locale)}
                </a>
              </time>
            </div> 
          </div>
        ))}
      </div>
    );
  }

  function DisplayWebMentions({wbm} : WebMentionsProps){
    if (!wbm) {
      return null; 
    }
  
    if( (wbm.likes ?? 0) < 1 && (wbm.reposts ?? 0) < 1 && wbm.mentions?.length == 0 ) {
      return null;

    }
    return (
      <div id="webmentions">
        <h3>Webmentions  <a href="/notes/webmentions" style="color:var(--secondary)"><i class="nf nf-fa-question_circle"></i></a></h3>
        {( (wbm.likes ?? 0) > 0 || (wbm.reposts ?? 0) > 0 ) && (
              <div id="webmentioncounters">
                <WebmentionsLikes wbm={wbm}/>
                <WebmentionsReposts wbm={wbm}/>
              </div>
            )}
        {( (wbm.mentions?.length ?? 0) > 0 && (
          <WebmentionsList wbm={wbm}/>))}
      </div>
    )
  }

  const doc = (
    <html lang={lang} dir={direction}>
      <Head {...componentData} />
      <body data-slug={slug}>
        <div id="quartz-root" class="page">
          <Body {...componentData}>
            {LeftComponent}
            <div class="center">
              <div id="indiewebinfo" class="h-card" style={{ display: 'none'}}>
                <a class="p-name u-url u-uid" rel="me" href="https://quantumgardener.info/">David C. Buchan</a>
                <a class="u-email" href="mailto:qg.info@mail.buchan.org"></a>
                <div class="p-locality">Bendigo</div>
                <div class="p-region">Victoria</div>
                <div class="p-country-name">Australia</div>
                <div class="p-job-title">Business Technology Consultant</div>
                <img class="u-photo u-logo" src="/static/qg-image-500.webp"/>
              </div>
              <div class="h-entry">
                <div class="page-header">
                  <Header {...componentData}>
                    {header.map((HeaderComponent) => (
                      <HeaderComponent {...componentData} />
                    ))}
                  </Header>
                  <div class="popover-hintx">
                    {beforeBody.map((BodyComponent) => (
                      <BodyComponent {...componentData} />
                    ))}
                  </div>
                </div>
              </div>
              <Content {...componentData} />
              { (prev || next) && (
                <div class="navContainer">
                  <div class="navPrev">
                    { prev && (
                      <div>
                        <i className={"nf nf-cod-triangle_left"} style={{marginRight: '0.3rem'}}/>
                        <a href={resolveRelative(slug!, prev.slug!)} className={"internal"}>
                          {prev.frontmatter?.title}
                        </a>
                      </div>
                    )}
                  </div>
                  <div class="navNext">
                    { next && (
                      <div>
                        <a href={resolveRelative(slug!, next.slug!)} className={"internal"}>
                          {next.frontmatter?.title}
                        </a> 
                        <i className={"nf nf-cod-triangle_right"} style={{marginLeft: '0.3rem'}}/>
                      </div>
                    )} 
                  </div>
                </div>
              )}
              <hr />
              <div id="engage">
                <div id="engage-buttons">
                  <button class="tinylytics_kudos"></button>
                  {
                    <button id="mastodonComment">
                      <div class="mastodon"><i class="nf nf-fa-mastodon"></i> Comment</div>
                    </button>
                  }
                  {
                    <button id="emailComment"><a href={emailComment(componentData.fileData.frontmatter?.title)}><i class="nf nf-md-email_check"></i> Comment</a></button>
                  }
                </div>
                <DisplayWebMentions wbm={webmentions}/>
              </div>
              <hr />
              <div class="page-footer">
                {afterBody.map((BodyComponent) => (
                  <BodyComponent {...componentData} />
                ))}
              </div>
            </div>
            {RightComponent}
            <Footer {...componentData} />
          </Body>
        </div>
      </body>
      {pageResources.js
        .filter((resource) => resource.loadTime === "afterDOMReady")
        .map((res) => JSResourceToScriptElement(res))}
    </html>
  )

  return "<!DOCTYPE html>\n" + render(doc)
}
