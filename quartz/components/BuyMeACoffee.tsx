import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
// @ts-ignore
import { classNames } from "../util/lang"

export default (() => {
  const BuyMeACoffee: QuartzComponent = ({ displayClass }: QuartzComponentProps) => {
    return (
      <div class={classNames(displayClass, "buyMeACoffee")}>
        <a href="https://buymeacoffee.com/dcbuchan"><i class="nf nf-fa-coffee"/> Buy me a coffee</a>
      </div>
    )
  }


  return BuyMeACoffee
}) satisfies QuartzComponentConstructor
