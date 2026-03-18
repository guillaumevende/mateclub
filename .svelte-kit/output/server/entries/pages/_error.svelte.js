import { d as derived, s as store_get, u as unsubscribe_stores } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
/* empty css                   */
import { e as escape_html } from "../../chunks/attributes.js";
function _error($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let status = derived(() => store_get($$store_subs ??= {}, "$page", page).status);
    $$renderer2.push(`<div class="error-container svelte-1j96wlh"><h1 class="svelte-1j96wlh">Une erreur s'est produite</h1> `);
    if (status()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="error-code svelte-1j96wlh">Erreur ${escape_html(status())}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <p class="error-message svelte-1j96wlh">Veuillez réessayer ou contacter l'administrateur si le problème persiste.</p> <a href="/" class="home-link svelte-1j96wlh">Retour à l'accueil</a></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _error as default
};
