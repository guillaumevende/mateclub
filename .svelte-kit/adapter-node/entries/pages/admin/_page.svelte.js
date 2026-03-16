import { h as ssr_context, e as ensure_array_like, f as attr_class, a as attr, d as derived } from "../../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
/* empty css                      */
import { A as Avatar } from "../../../chunks/Avatar.js";
import { e as escape_html } from "../../../chunks/escaping.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    let adminCount = derived(() => data.users.filter((u) => u.is_admin).length);
    data.currentUser?.super_powers === 1;
    onDestroy(() => {
    });
    $$renderer2.push(`<div class="container"><h1>Administration</h1> <section><h2>Mes super pouvoirs</h2> `);
    if (data.currentUser?.super_powers === 1) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="super-text svelte-1jef3w8">Vous avez des super pouvoirs : vous pouvez écouter les enregistrements du jour 
				sans attendre votre prochaine livraison. Jouez le jeu et annulez cette possibilité 
				en cliquant ci-dessous.</p> <form method="POST" action="?/toggleSuperPowers"><input type="hidden" name="enabled" value="false"/> <button type="submit" class="super-btn svelte-1jef3w8">✅ Désactiver les super pouvoirs</button></form>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="super-text svelte-1jef3w8">Vous n'avez aucun privilège. Activez les super pouvoirs pour écouter 
				les enregistrements du jour sans attendre votre prochaine livraison. 
				Vous devriez jouer le jeu et ne l'activer qu'à titre exceptionnel.</p> <form method="POST" action="?/toggleSuperPowers"><input type="hidden" name="enabled" value="true"/> <button type="submit" class="super-btn svelte-1jef3w8">✨ Activer les super pouvoirs</button></form>`);
    }
    $$renderer2.push(`<!--]--></section> <section><h2>Créer un utilisateur</h2> <form method="POST" action="?/create"><input type="text" name="pseudo" placeholder="Pseudo" required=""/> <input type="password" name="password" placeholder="Mot de passe" required=""/> <label class="checkbox"><input type="checkbox" name="is_admin"/> Admin</label> <button type="submit">Créer</button></form></section> <section><h2>Utilisateurs</h2> <div class="users svelte-1jef3w8"><!--[-->`);
    const each_array = ensure_array_like(data.users);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let user = each_array[$$index];
      const isLastAdmin = user.is_admin && adminCount() === 1;
      const isSelf = user.id === data.currentUser?.id;
      const canDelete = !isLastAdmin && !isSelf;
      $$renderer2.push(`<div class="user svelte-1jef3w8">`);
      Avatar($$renderer2, { avatar: user.avatar, size: "small" });
      $$renderer2.push(`<!----> <span class="pseudo svelte-1jef3w8">${escape_html(user.pseudo)}</span> <span${attr_class("badge svelte-1jef3w8", void 0, { "admin": user.is_admin, "member": !user.is_admin })}>${escape_html(user.is_admin ? "Admin" : "Membre")}</span> <form method="POST" action="?/delete" style="display: none"${attr("data-user-id", user.id)}><input type="hidden" name="user_id"${attr("value", user.id)}/></form> <button type="button"${attr_class("delete svelte-1jef3w8", void 0, { "disabled": !canDelete })}${attr("disabled", !canDelete, true)}${attr("title", isSelf ? "Vous ne pouvez pas vous supprimer vous-même" : isLastAdmin ? "Impossible de supprimer le dernier admin" : "")}>Supprimer</button></div>`);
    }
    $$renderer2.push(`<!--]--></div></section> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
