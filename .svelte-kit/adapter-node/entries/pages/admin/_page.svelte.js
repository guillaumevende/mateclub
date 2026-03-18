import { f as ssr_context, e as ensure_array_like, c as attr_class, d as derived } from "../../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import { a as attr, e as escape_html } from "../../../chunks/attributes.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
/* empty css                      */
import { A as Avatar } from "../../../chunks/Avatar.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data, form } = $$props;
    const emojis = [
      "☕",
      "😀",
      "😎",
      "🤠",
      "🥳",
      "😇",
      "🤩",
      "😈",
      "👻",
      "🤖",
      "🎸",
      "🎮",
      "🚀",
      "🍕",
      "🍺",
      "🌈",
      "🔥",
      "⭐",
      "❤️"
    ];
    let selectedAvatar = "☕";
    let adminCount = derived(() => data.users.filter((u) => u.is_admin).length);
    data.currentUser?.super_powers === 1;
    onDestroy(() => {
    });
    $$renderer2.push(`<div class="container"><h1>Administration</h1> <section><h2>Mes super pouvoirs</h2> `);
    if (data.currentUser?.super_powers === 1) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="super-text svelte-1jef3w8">Vous avez des super pouvoirs : vous pouvez écouter les enregistrements du jour 
				sans attendre votre prochaine livraison. Jouez le jeu et annulez cette possibilité 
				en cliquant ci-dessous.</p> <form method="POST" action="?/toggleSuperPowers"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="enabled" value="false"/> <button type="submit" class="super-btn svelte-1jef3w8">✅ Désactiver les super pouvoirs</button></form>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<p class="super-text svelte-1jef3w8">Vous n'avez aucun privilège. Activez les super pouvoirs pour écouter 
				les enregistrements du jour sans attendre votre prochaine livraison. 
				Vous devriez jouer le jeu et ne l'activer qu'à titre exceptionnel.</p> <form method="POST" action="?/toggleSuperPowers"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="enabled" value="true"/> <button type="submit" class="super-btn svelte-1jef3w8">✨ Activer les super pouvoirs</button></form>`);
    }
    $$renderer2.push(`<!--]--></section> <section><h2>Logs</h2> <p class="super-text svelte-1jef3w8">Affichez le bouton d'accès aux logs du player audio (pour développement et debug).</p> `);
    if (data.currentUser?.logs_enabled === 1) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<form method="POST" action="?/toggleLogs"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="enabled" value="false"/> <button type="submit" class="super-btn logs-btn svelte-1jef3w8">🔴 Désactiver les logs</button></form>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form method="POST" action="?/toggleLogs"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="enabled" value="true"/> <button type="submit" class="super-btn logs-btn svelte-1jef3w8">✅ Activer les logs</button></form>`);
    }
    $$renderer2.push(`<!--]--></section> <section><h2>Jingle d'intro</h2> <p class="super-text svelte-1jef3w8">Ajoutez un jingle musical au début de la première capsule de la journée.</p> `);
    if (data.currentUser?.jingles_enabled === 1) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<form method="POST" action="?/toggleJingles"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="enabled" value="false"/> <button type="submit" class="super-btn logs-btn svelte-1jef3w8">🔊 Désactiver le jingle</button></form>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<form method="POST" action="?/toggleJingles"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="enabled" value="true"/> <button type="submit" class="super-btn logs-btn svelte-1jef3w8">🔇 Activer le jingle</button></form>`);
    }
    $$renderer2.push(`<!--]--></section> <section><h2>Créer un utilisateur</h2> <form method="POST" action="?/create"><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <div class="pseudo-field svelte-1jef3w8"><input type="text" name="pseudo" placeholder="Pseudo" required=""/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="password-field svelte-1jef3w8"><input type="password" name="password" placeholder="Mot de passe (12 caractères minimum)" required="" class="svelte-1jef3w8"/> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <label class="checkbox"><input type="checkbox" name="is_admin"/> Admin</label> <p class="avatar-label svelte-1jef3w8">Avatar par défaut :</p> <div class="avatar-selection svelte-1jef3w8"><!--[-->`);
    const each_array = ensure_array_like(emojis);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let emoji = each_array[$$index];
      $$renderer2.push(`<label${attr_class("avatar-option svelte-1jef3w8", void 0, { "selected": selectedAvatar === emoji })}><input type="radio" name="avatar"${attr("value", emoji)}${attr("checked", selectedAvatar === emoji, true)} class="svelte-1jef3w8"/> <span class="svelte-1jef3w8">${escape_html(emoji)}</span></label>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button type="submit">Créer</button></form></section> <section><h2>Utilisateurs</h2> <div class="users svelte-1jef3w8"><!--[-->`);
    const each_array_1 = ensure_array_like(data.users);
    for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
      let user = each_array_1[$$index_1];
      const isLastAdmin = user.is_admin && adminCount() === 1;
      const isSelf = user.id === data.currentUser?.id;
      const canDelete = !isLastAdmin && !isSelf;
      $$renderer2.push(`<div class="user svelte-1jef3w8">`);
      Avatar($$renderer2, { avatar: user.avatar, size: "small" });
      $$renderer2.push(`<!----> <span class="pseudo svelte-1jef3w8">${escape_html(user.pseudo)}</span> <span${attr_class("badge svelte-1jef3w8", void 0, { "admin": user.is_admin, "member": !user.is_admin })}>${escape_html(user.is_admin ? "Admin" : "Membre")}</span> <form method="POST" action="?/delete" style="display: none"${attr("data-user-id", user.id)}><input type="hidden" name="csrf_token"${attr("value", data.csrfToken)}/> <input type="hidden" name="user_id"${attr("value", user.id)}/></form> <button type="button"${attr_class("delete svelte-1jef3w8", void 0, { "disabled": !canDelete })}${attr("disabled", !canDelete, true)}${attr("title", isSelf ? "Vous ne pouvez pas vous supprimer vous-même" : isLastAdmin ? "Impossible de supprimer le dernier admin" : "")}>Supprimer</button></div>`);
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
