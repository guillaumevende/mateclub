import { a as attr, b as attr_style, d as derived, c as stringify } from "./index2.js";
import { e as escape_html } from "./escaping.js";
function Avatar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { avatar, size = "medium" } = $$props;
    let isImage = derived(() => typeof avatar === "string" && (avatar.includes("/") || avatar.startsWith("avatar_")));
    const sizeStyles = {
      small: "width: 48px; height: 48px;",
      medium: "width: 64px; height: 64px;",
      large: "width: 96px; height: 96px;"
    };
    if (isImage()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<img${attr("src", `/uploads/avatars/${stringify(avatar)}`)} alt="Avatar"${attr_style(`${stringify(sizeStyles[size])} border-radius: 50%; object-fit: cover; border: 2px solid #1a1a2e;`)}/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span${attr_style(`${stringify(sizeStyles[size])} display: flex; align-items: center; justify-content: center; background: #1a1a2e; border-radius: 50%; border: 2px solid #2a2a4e; font-size: ${stringify(size === "small" ? "28px" : size === "medium" ? "36px" : "48px")};`)}>${escape_html(avatar || "☕")}</span>`);
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  Avatar as A
};
