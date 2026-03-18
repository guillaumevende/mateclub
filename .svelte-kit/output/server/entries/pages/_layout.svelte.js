import { s as store_get, a as attr_style, b as stringify, u as unsubscribe_stores, d as derived, c as attr_class, e as ensure_array_like } from "../../chunks/index2.js";
import { p as page } from "../../chunks/stores.js";
import { p as playerStore } from "../../chunks/player.js";
import { e as escape_html, a as attr } from "../../chunks/attributes.js";
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
      if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    function formatFullDate() {
      if (!player.currentRecording) return "";
      const timezone = store_get($$store_subs ??= {}, "$page", page).data.user?.timezone || "Europe/Paris";
      const recordedAt = new Date(player.currentRecording.recorded_at);
      const formatter = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timezone
      });
      return formatter.format(recordedAt).replace(/^./, (str) => str.toUpperCase()).replace(":", "h");
    }
    function formatPosition() {
      if (!player.currentDayData || !player.currentRecording) return "";
      const total = player.currentDayData.recordings.length;
      const position = player.currentIndex + 1;
      return `(${position}/${total})`;
    }
    function formatDuration() {
      if (!player.currentRecording) return "";
      const mins = Math.floor(player.currentRecording.duration_seconds / 60);
      const secs = player.currentRecording.duration_seconds % 60;
      if (secs === 0) {
        return `${mins}min`;
      }
      return `${mins}min ${secs}`;
    }
    let hasPrevious = derived(() => player.currentDayData && player.currentIndex > 0);
    let hasNext = derived(() => player.currentDayData && player.currentIndex < player.currentDayData.recordings.length - 1);
    let displayDuration = derived(() => player.currentRecording?.duration_seconds || 0);
    let progressPercent = derived(() => displayDuration() > 0 ? Math.min(100, player.progress / displayDuration() * 100) : 0);
    if (player.currentRecording) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="floating-player svelte-m2forl"><div class="player-layout svelte-m2forl"><div class="close-column svelte-m2forl"><button class="close-btn svelte-m2forl" aria-label="Fermer">✕</button></div> <div class="content-wrapper svelte-m2forl"><div class="info-column svelte-m2forl"><div class="date-line svelte-m2forl">${escape_html(formatFullDate())}</div> <div class="position-line svelte-m2forl">${escape_html(formatPosition())} • ${escape_html(formatDuration())}</div> <div class="controls-line svelte-m2forl"><button class="control-btn svelte-m2forl"${attr("disabled", !hasPrevious(), true)} aria-label="Précédent">⏮️</button> <button class="play-btn svelte-m2forl"${attr("disabled", player.isLoading, true)}${attr("aria-label", player.isPlaying ? "Pause" : "Lecture")}>${escape_html(player.isLoading ? "⏳" : player.isPlaying ? "⏸️" : "▶️")}</button> <button class="control-btn svelte-m2forl"${attr("disabled", !hasNext(), true)} aria-label="Suivant">⏭️</button></div></div></div></div> <div class="progress-container svelte-m2forl"><span class="time current svelte-m2forl">${escape_html(formatTime(player.progress))}</span> <div class="progress-track svelte-m2forl" role="slider" tabindex="0"${attr("aria-valuenow", player.progress)}${attr("aria-valuemin", 0)}${attr("aria-valuemax", displayDuration())}><div class="progress-fill svelte-m2forl"${attr_style(`width: ${stringify(progressPercent())}%`)}></div> <div class="progress-thumb svelte-m2forl"${attr_style(`left: calc(${stringify(progressPercent())}% + 7px - ${stringify(progressPercent() * 0.14)}px)`)}></div></div> <span class="time duration svelte-m2forl">${escape_html(formatTime(displayDuration()))}</span></div></div>`);
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
    $$renderer2.push(`<audio id="persistent-audio" preload="auto" style="display: none;"></audio> <audio id="audio-guardian" loop="" preload="auto" style="display: none;" src="/silence.mp3"></audio> <audio id="jingle-audio" preload="auto" style="display: none;" src="/jingle-intro.mp3"></audio> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <nav${attr_class("svelte-12qhfyh", void 0, { "with-player": showPlayer() })}>`);
    if (showPlayer()) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="player-area svelte-12qhfyh">`);
      FloatingPlayer($$renderer2);
      $$renderer2.push(`<!----></div> <div class="player-nav-divider svelte-12qhfyh"></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="nav-items svelte-12qhfyh">`);
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
        $$renderer2.push(`<a href="/admin"${attr_class("svelte-12qhfyh", void 0, {
          "active": store_get($$store_subs ??= {}, "$page", page).url.pathname === "/admin"
        })}><span class="icon svelte-12qhfyh">🚀</span> <span class="label svelte-12qhfyh">Admin</span></a>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (data.user?.logs_enabled) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="nav-btn svelte-12qhfyh" style="color: yellow;"><span class="icon svelte-12qhfyh">🔧</span> <span class="label svelte-12qhfyh">Logs</span></button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></nav> <main${attr_class("svelte-12qhfyh", void 0, { "logged-in": !!data.user, "with-player": showPlayer() })}>`);
    children($$renderer2);
    $$renderer2.push(`<!----></main>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _layout as default
};
