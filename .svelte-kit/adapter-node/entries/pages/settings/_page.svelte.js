import { b as stringify, c as attr_class, e as ensure_array_like, d as derived } from "../../../chunks/index2.js";
import { a as attr, e as escape_html } from "../../../chunks/attributes.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/root.js";
import "../../../chunks/state.svelte.js";
/* empty css                      */
import "browser-image-compression";
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
    const PSEUDO_REGEX = /^[a-zA-Z0-9\s\-._àáâãäåæçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŸ]{3,22}$/;
    let pseudo = data.user?.pseudo || "";
    let password = "";
    let confirmPassword = "";
    let isImageAvatar = data.user?.avatar?.includes("avatar_") || false;
    let selectedEmoji = data.user?.avatar?.includes("avatar_") ? "" : data.user?.avatar || "☕";
    let savedImageFilename = data.savedImage;
    let isCompressing = false;
    let isDragging = false;
    let selectedHour = "";
    let selectedTimezone = "Europe/Paris";
    let pseudoError = derived(() => {
      if (pseudo.length === 0) return "";
      if (pseudo.length < 3) return "Le pseudo doit contenir au moins 3 caractères";
      if (pseudo.length > 22) return "Le pseudo ne doit pas dépasser 22 caractères";
      if (!PSEUDO_REGEX.test(pseudo)) return "Caractères non autorisés (emojis et caractères spéciaux interdits)";
      return "";
    });
    let passwordValidation = derived(() => {
      return { valid: true, message: "" };
    });
    function getAvatarDisplay() {
      if (isImageAvatar && data.user?.avatar) {
        return { type: "image", value: data.user.avatar };
      }
      return {
        type: "emoji",
        value: selectedEmoji || data.user?.avatar || "☕"
      };
    }
    $$renderer2.push(`<div class="container"><h1>Paramètres</h1> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="current-avatar-display svelte-1i19ct2">`);
    if (getAvatarDisplay().type === "image") {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<img${attr("src", `/uploads/avatars/${stringify(getAvatarDisplay().value)}`)} alt="Avatar" class="avatar-image svelte-1i19ct2"/>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span class="avatar-emoji svelte-1i19ct2">${escape_html(getAvatarDisplay().value)}</span>`);
    }
    $$renderer2.push(`<!--]--></div> <form method="POST"><input type="hidden" name="avatarImage"${attr("value", savedImageFilename || "")}/> <input type="hidden" name="csrf_token"${attr("value", data?.csrfToken)}/> <section><h2>Nom d'utilisateur</h2> <input type="text" name="pseudo"${attr("value", pseudo)} placeholder="Votre pseudo" minlength="3" maxlength="22" required=""/> `);
    if (pseudoError()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p class="pseudo-feedback error svelte-1i19ct2">${escape_html(pseudoError())}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section> <section><h2>Avatar</h2> <div${attr_class("avatar-upload-section svelte-1i19ct2", void 0, { "dragging": isDragging })}>`);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (isImageAvatar) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label${attr_class("upload-zone svelte-1i19ct2", void 0, { "disabled": isCompressing })}><input type="file" accept="image/*" capture="environment"${attr("disabled", isCompressing, true)} class="svelte-1i19ct2"/> <span class="svelte-1i19ct2">🖼️ Changer la photo</span></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<label${attr_class("upload-zone svelte-1i19ct2", void 0, { "disabled": isCompressing })}><input type="file" accept="image/*" capture="environment"${attr("disabled", isCompressing, true)} class="svelte-1i19ct2"/> <span class="svelte-1i19ct2">📷 Prendre ou choisir une photo</span></label>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div> <p class="emoji-label svelte-1i19ct2">Ou choisissez un emoji :</p> <div class="emoji-grid svelte-1i19ct2"><!--[-->`);
    const each_array = ensure_array_like(emojis);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let emoji = each_array[$$index];
      $$renderer2.push(`<label${attr_class("emoji-option svelte-1i19ct2", void 0, { "selected": !isImageAvatar && selectedEmoji === emoji })}><input type="radio" name="avatar"${attr("value", emoji)}${attr("checked", !isImageAvatar && selectedEmoji === emoji, true)} class="svelte-1i19ct2"/> <span class="svelte-1i19ct2">${escape_html(emoji)}</span></label>`);
    }
    $$renderer2.push(`<!--]--> `);
    if (savedImageFilename) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<label${attr_class("emoji-option image-option svelte-1i19ct2", void 0, { "selected": isImageAvatar })}><input type="radio" name="avatar"${attr("value", savedImageFilename)}${attr("checked", isImageAvatar, true)} class="svelte-1i19ct2"/> <img${attr("src", `/uploads/avatars/${stringify(savedImageFilename)}`)} alt="Mon avatar" class="saved-image-thumb svelte-1i19ct2"/></label>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></section> <section><h2>Changer le mot de passe</h2> <p class="description svelte-1i19ct2">Indiquez ici votre nouveau mot de passe et faites 'Sauvegarder'</p> <div class="password-section svelte-1i19ct2"><input type="password" name="password" placeholder="Nouveau mot de passe"${attr("value", password)} minlength="10"/> <input type="password" name="confirmPassword" placeholder="Confirmez le mot de passe"${attr("value", confirmPassword)} minlength="10"/> `);
    if (passwordValidation().message) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<p${attr_class("password-feedback svelte-1i19ct2", void 0, {
        "error": !passwordValidation().valid,
        "success": passwordValidation().valid && password.length >= 10
      })}>${escape_html(passwordValidation().message)}</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></section> <section><h2>Fuseau horaire</h2> <p class="description svelte-1i19ct2">Utilisé pour afficher les dates et heures dans ton fuseau.</p> `);
    $$renderer2.select(
      { name: "timezone", value: selectedTimezone, class: "" },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(data.timezones);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let tz = each_array_1[$$index_1];
          $$renderer3.option({ value: tz.value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(tz.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      },
      "svelte-1i19ct2"
    );
    $$renderer2.push(`</section> <section><h2>Heure de disponibilité</h2> <p class="description svelte-1i19ct2">Les enregistrements de la veille seront disponibles à partir de cette heure (dans ton fuseau horaire).</p> <div class="hour-input svelte-1i19ct2"><input type="time" name="hour"${attr("value", selectedHour)} class="svelte-1i19ct2"/></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></section> <button type="submit" class="svelte-1i19ct2">Sauvegarder</button></form> <a href="/logout" class="btn svelte-1i19ct2" data-sveltekit-reload="">Déconnexion</a></div>`);
  });
}
export {
  _page as default
};
