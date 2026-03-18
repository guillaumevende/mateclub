import { a as attr } from "./attributes.js";
function ImageViewer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { imageUrl, isOpen, onClose } = $$props;
    if (isOpen && imageUrl) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="image-viewer-overlay svelte-1cabxtb" role="button" tabindex="0" aria-label="Fermer l'image"><img${attr("src", imageUrl)} alt="" class="image-viewer-img svelte-1cabxtb"/></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  ImageViewer as I
};
