import { a as attr, e as escape_html } from "../../../chunks/attributes.js";
/* empty css                      */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { form, data } = $$props;
    $$renderer2.push(`<div class="setup-container svelte-g40i6i"><img src="/logo512px.png" alt="MateClub" class="logo svelte-g40i6i"/> <h1 class="svelte-g40i6i">Configuration initiale</h1> <p class="subtitle svelte-g40i6i">Créez votre compte administrateur</p> `);
    if (form?.success) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="success svelte-g40i6i"><p class="svelte-g40i6i">✅ Compte administrateur créé !</p> <a href="/login" class="btn svelte-g40i6i">Aller à la page de connexion</a></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form method="POST" class="svelte-g40i6i"><input type="hidden" name="csrf_token"${attr("value", data?.csrfToken)} class="svelte-g40i6i"/> <input type="text" name="pseudo" placeholder="Pseudo" required="" autocomplete="username" minlength="2" maxlength="20" class="svelte-g40i6i"/> <input type="password" name="password" placeholder="Mot de passe (min. 10 caractères)" required="" autocomplete="new-password" minlength="10" class="svelte-g40i6i"/> <input type="password" name="confirm_password" placeholder="Confirmer le mot de passe" required="" autocomplete="new-password" minlength="10" class="svelte-g40i6i"/> `);
      if (form?.error) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="error svelte-g40i6i">${escape_html(form.error)}</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <button type="submit" class="svelte-g40i6i">Créer le compte</button></form> <p class="note svelte-g40i6i">Après création, vous pourrez créer d'autres utilisateurs depuis le panel admin.</p>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
