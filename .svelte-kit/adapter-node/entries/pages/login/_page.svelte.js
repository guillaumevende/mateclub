import { e as escape_html } from "../../../chunks/escaping.js";
import "clsx";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { form } = $$props;
    $$renderer2.push(`<div class="login-container svelte-1x05zx6"><img src="/logo512px.png" alt="MateClub" class="logo svelte-1x05zx6"/> <form method="POST" class="svelte-1x05zx6"><input type="text" name="pseudo" placeholder="Pseudo" required="" autocomplete="username" class="svelte-1x05zx6"/> <input type="password" name="password" placeholder="Mot de passe" required="" autocomplete="current-password" class="svelte-1x05zx6"/> `);
    if (form?.error) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="error svelte-1x05zx6">${escape_html(form.error)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit" class="svelte-1x05zx6">Connexion</button></form></div>`);
  });
}
export {
  _page as default
};
