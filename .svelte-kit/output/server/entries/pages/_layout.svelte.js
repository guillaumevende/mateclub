import { g as getContext, s as store_get, a as attr, b as attr_style, c as stringify, u as unsubscribe_stores, d as derived, e as ensure_array_like, f as attr_class } from "../../chunks/index2.js";
import "clsx";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { p as playerStore } from "../../chunks/player.js";
import { A as Avatar } from "../../chunks/Avatar.js";
import { e as escape_html } from "../../chunks/escaping.js";
const getStores = () => {
  const stores$1 = getContext("__svelte__");
  return {
    /** @type {typeof page} */
    page: {
      subscribe: stores$1.page.subscribe
    },
    /** @type {typeof navigating} */
    navigating: {
      subscribe: stores$1.navigating.subscribe
    },
    /** @type {typeof updated} */
    updated: stores$1.updated
  };
};
const page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
function FloatingPlayer($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let player = {
      ...store_get($$store_subs ??= {}, "$playerStore", playerStore)
    };
    playerStore.subscribe((value) => {
      player = value;
    });
    function formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    function formatDateOnly() {
      if (!player.currentRecording) return "";
      const timezone = store_get($$store_subs ??= {}, "$page", page).data.user?.timezone || "Europe/Paris";
      const recordedAt = new Date(player.currentRecording.recorded_at);
      const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: timezone });
      return dateFormatter.format(recordedAt);
    }
    function formatPositionAndTime() {
      if (!player.currentDayData || !player.currentRecording) return "";
      const total = player.currentDayData.recordings.length;
      const position = player.currentIndex + 1;
      const timezone = store_get($$store_subs ??= {}, "$page", page).data.user?.timezone || "Europe/Paris";
      const recordedAt = new Date(player.currentRecording.recorded_at);
      const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", timeZone: timezone });
      return `(${position}/${total}) ${timeFormatter.format(recordedAt)}`;
    }
    let isFromHomepage = derived(() => !!player.currentDay && !!player.currentRecording);
    let hasPrevious = derived(() => player.currentDayData && player.currentIndex > 0);
    let hasNext = derived(() => player.currentDayData && player.currentIndex < player.currentDayData.recordings.length - 1);
    let progressPercent = derived(() => player.duration > 0 ? player.progress / player.duration * 100 : 0);
    if (player.currentRecording) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="floating-player svelte-m2forl"><div class="player-content svelte-m2forl"><button class="close-btn svelte-m2forl" aria-label="Fermer">✕</button> `);
      if (!isFromHomepage()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="player-avatar svelte-m2forl">`);
        Avatar($$renderer2, { avatar: player.currentRecording.avatar, size: "medium" });
        $$renderer2.push(`<!----></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <div class="player-info svelte-m2forl">`);
      if (isFromHomepage()) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="player-date svelte-m2forl">${escape_html(formatDateOnly())}</span> <span class="player-position-time svelte-m2forl">${escape_html(formatPositionAndTime())}</span> <div class="player-author svelte-m2forl">`);
        Avatar($$renderer2, { avatar: player.currentRecording.avatar, size: "small" });
        $$renderer2.push(`<!----> <span class="player-author-name svelte-m2forl">${escape_html(player.currentRecording.pseudo)}</span></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<span class="player-title svelte-m2forl">${escape_html(player.currentRecording.pseudo)}</span>`);
      }
      $$renderer2.push(`<!--]--></div> <div class="player-controls svelte-m2forl"><button class="control-btn svelte-m2forl"${attr("disabled", !hasPrevious(), true)} aria-label="Précédent">⏮️</button> <button class="play-btn svelte-m2forl"${attr("disabled", player.isLoading, true)}${attr("aria-label", player.isPlaying ? "Pause" : "Lecture")}>${escape_html(player.isLoading ? "⏳" : player.isPlaying ? "⏸️" : "▶️")}</button> <button class="control-btn svelte-m2forl"${attr("disabled", !hasNext(), true)} aria-label="Suivant">⏭️</button></div></div> <div class="progress-container svelte-m2forl"><span class="time current svelte-m2forl">${escape_html(formatTime(player.progress))}</span> <div class="progress-track svelte-m2forl" role="slider" tabindex="0"${attr("aria-valuenow", player.progress)}${attr("aria-valuemin", 0)}${attr("aria-valuemax", player.duration)}><div class="progress-fill svelte-m2forl"${attr_style(`width: ${stringify(progressPercent())}%`)}></div> <div class="progress-thumb svelte-m2forl"${attr_style(`left: ${stringify(progressPercent())}%`)}></div></div> <span class="time duration svelte-m2forl">${escape_html(formatTime(player.duration))}</span></div></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]-->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { children, data } = $$props;
    const navItems = [
      { href: "/", label: "Accueil", icon: "🏠" },
      { href: "/record", label: "Enregistrer", icon: "🎙️" },
      { href: "/settings", label: "Réglages", icon: "⚙️" }
    ];
    let showPlayer = derived(() => store_get($$store_subs ??= {}, "$playerStore", playerStore).currentRecording !== null);
    $$renderer2.push(`<audio id="persistent-audio" preload="auto" style="display: none;"></audio> <audio id="audio-guardian" loop="" preload="auto" style="display: none;" src="/silence.mp3"></audio> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <nav class="svelte-12qhfyh">`);
    if (data.user) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<!--[-->`);
      const each_array_1 = ensure_array_like(navItems);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let item = each_array_1[$$index_1];
        if (item.onclick) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="nav-btn svelte-12qhfyh"><span class="icon svelte-12qhfyh">${escape_html(item.icon)}</span> <span class="label svelte-12qhfyh">${escape_html(item.label)}</span></button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<a${attr("href", item.href)}${attr_class("svelte-12qhfyh", void 0, {
            "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === item.href
          })}><span class="icon svelte-12qhfyh">${escape_html(item.icon)}</span> <span class="label svelte-12qhfyh">${escape_html(item.label)}</span></a>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--> `);
      if (data.user?.is_admin) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="nav-btn svelte-12qhfyh" style="color: yellow;"><span class="icon svelte-12qhfyh">🔧</span> <span class="label svelte-12qhfyh">Logs</span></button> <a href="/admin"${attr_class("svelte-12qhfyh", void 0, {
          "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/admin"
        })}><span class="icon svelte-12qhfyh">🚀</span> <span class="label svelte-12qhfyh">Admin</span></a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></nav> `);
    if (showPlayer()) {
      $$renderer2.push("<!--[0-->");
      FloatingPlayer($$renderer2);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <main${attr_class("svelte-12qhfyh", void 0, { "logged-in": !!data.user })}>`);
    children($$renderer2);
    $$renderer2.push(`<!----></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
