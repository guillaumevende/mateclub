import { e as ensure_array_like, a as attr_style, c as attr_class, d as derived, b as stringify } from "../../chunks/index2.js";
import { e as escape_html, a as attr } from "../../chunks/attributes.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/root.js";
import "../../chunks/state.svelte.js";
import { A as Avatar } from "../../chunks/Avatar.js";
import { I as ImageViewer } from "../../chunks/ImageViewer.js";
/* empty css                   */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    let allDays = [];
    let player = {
      isPlaying: false,
      currentRecording: null
    };
    let selectedImageUrl = null;
    let listenedRecordings = /* @__PURE__ */ new Set();
    let unreadStats = derived(() => {
      if (data.unreadStats) {
        return data.unreadStats;
      }
      const allRecordings = [
        ...[],
        ...allDays.flatMap((d) => d.recordings)
      ];
      const unread = allRecordings.filter((r) => !listenedRecordings.has(r.id) && r.listened_by_user !== 1);
      const totalSeconds = unread.reduce((sum, r) => sum + r.duration_seconds, 0);
      return { count: unread.length, totalSeconds };
    });
    function isCurrentPlaying(recordingId) {
      return player.currentRecording?.id === recordingId && player.isPlaying;
    }
    function isCurrentRecording(recordingId) {
      return player.currentRecording?.id === recordingId;
    }
    function getDayAuthors(recordings) {
      const seen = /* @__PURE__ */ new Set();
      return recordings.filter((r) => {
        if (seen.has(r.user_id)) return false;
        seen.add(r.user_id);
        return true;
      });
    }
    function getUserToday() {
      const timezone = data.user?.timezone || "Europe/Paris";
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      return formatter.format(/* @__PURE__ */ new Date());
    }
    function getUserYesterday() {
      const yesterday = /* @__PURE__ */ new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const timezone = data.user?.timezone || "Europe/Paris";
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      return formatter.format(yesterday);
    }
    function formatDateHeader(dateStr, recordings) {
      const today = getUserToday();
      const yesterday = getUserYesterday();
      const uniqueUsers = new Set(recordings.map((r) => r.user_id));
      const hasMultipleUsers = uniqueUsers.size >= 2;
      const fireEmoji = hasMultipleUsers ? "🔥 " : "";
      if (dateStr === today) return `${fireEmoji}Aujourd'hui`;
      if (dateStr === yesterday) return `${fireEmoji}Hier, ${formatDate(dateStr)}`;
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      return `${fireEmoji}${formattedDate.charAt(0).toUpperCase()}${formattedDate.slice(1)}`;
    }
    function getTotalDuration(recordings) {
      return recordings.reduce((total, r) => total + r.duration_seconds, 0);
    }
    function formatDurationFull(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    function getTodayDate() {
      const date = /* @__PURE__ */ new Date();
      const formatted = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
      return formatted.toUpperCase();
    }
    function formatTime(dateStr) {
      const date = new Date(dateStr);
      const timezone = data.user?.timezone || "Europe/Paris";
      const formatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: timezone });
      return formatter.format(date).replace(":", "h");
    }
    function formatDuration(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    function isRecordingListened(recording) {
      return listenedRecordings.has(recording.id) || recording.listened_by_user === 1;
    }
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="container svelte-1uha8ag"><header class="svelte-1uha8ag"><img src="/logo512px.png" alt="MateClub" class="logo svelte-1uha8ag"/> <p class="date svelte-1uha8ag">${escape_html(getTodayDate())}</p> <p class="welcome svelte-1uha8ag">Bienvenue, ${escape_html(data.user?.pseudo)} !</p> `);
    if (unreadStats().count > 0) {
      $$renderer2.push("<!--[0-->");
      const hours = Math.floor(unreadStats().totalSeconds / 3600);
      const mins = Math.floor(unreadStats().totalSeconds % 3600 / 60);
      const secs = unreadStats().totalSeconds % 60;
      $$renderer2.push(`<p class="unread-stats svelte-1uha8ag">${escape_html(unreadStats().count)} capsule${escape_html(unreadStats().count !== 1 ? "s" : "")} audio non lue${escape_html(unreadStats().count !== 1 ? "s" : "")}<br class="svelte-1uha8ag"/> (`);
      if (hours > 0) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`${escape_html(hours)} heure${escape_html(hours !== 1 ? "s" : "")} et ${escape_html(mins)} minute${escape_html(mins !== 1 ? "s" : "")}`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`${escape_html(mins)} minute${escape_html(mins !== 1 ? "s" : "")} et ${escape_html(secs)} seconde${escape_html(secs !== 1 ? "s" : "")}`);
      }
      $$renderer2.push(`<!--]-->)</p>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <button class="team-button svelte-1uha8ag">👥</button></header> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (allDays.length === 0 && true) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="empty svelte-1uha8ag">`);
      if (data.days) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<p class="svelte-1uha8ag">Pas encore de capsule à écouter. Créez vos utilisateurs et faites un premier enregistrement audio.</p>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<p class="svelte-1uha8ag">Chargement des capsules...</p>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array_5 = ensure_array_like(allDays);
      for (let $$index_7 = 0, $$length = each_array_5.length; $$index_7 < $$length; $$index_7++) {
        let day = each_array_5[$$index_7];
        $$renderer2.push(`<section class="day-section svelte-1uha8ag"${attr("data-day", day.date)}><div class="day-header-new svelte-1uha8ag"><div class="day-header-left svelte-1uha8ag"><h2 class="day-title svelte-1uha8ag">${escape_html(formatDateHeader(day.date, day.recordings))} `);
        if (!day.available) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<span class="locked-icon svelte-1uha8ag">🔒</span>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></h2> <span class="day-count svelte-1uha8ag">${escape_html(day.recordings.length)} capsule${escape_html(day.recordings.length !== 1 ? "s" : "")}</span> `);
        if (day.recordings.length > 0) {
          $$renderer2.push("<!--[0-->");
          const authors = getDayAuthors(day.recordings);
          const displayAuthors = authors.slice(0, 10);
          const hasMore = authors.length > 10;
          const showAuthors = authors.length >= 2;
          if (showAuthors) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<div class="day-authors-header svelte-1uha8ag"><!--[-->`);
            const each_array_6 = ensure_array_like(displayAuthors);
            for (let i = 0, $$length2 = each_array_6.length; i < $$length2; i++) {
              let author = each_array_6[i];
              $$renderer2.push(`<div class="author-avatar-header svelte-1uha8ag"${attr("title", author.pseudo)}${attr_style(`margin-left: ${stringify(i === 0 ? 0 : -17)}px; z-index: ${stringify(i)}`)}>`);
              Avatar($$renderer2, { avatar: author.avatar, size: "small" });
              $$renderer2.push(`<!----></div>`);
            }
            $$renderer2.push(`<!--]--> `);
            if (hasMore) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="author-avatar-header more-avatars svelte-1uha8ag" style="margin-left: -17px; z-index: 0"><span class="svelte-1uha8ag">+${escape_html(authors.length - 10)}</span></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]-->`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--></div> <div class="day-header-right svelte-1uha8ag"><span class="day-duration svelte-1uha8ag">${escape_html(formatDurationFull(getTotalDuration(day.recordings)))}</span></div></div> <div class="recordings-scroller svelte-1uha8ag"><div class="recordings-row svelte-1uha8ag"><!--[-->`);
        const each_array_7 = ensure_array_like(day.recordings);
        for (let index = 0, $$length2 = each_array_7.length; index < $$length2; index++) {
          let recording = each_array_7[index];
          const hasImage = recording.image_filename;
          const isListened = isRecordingListened(recording);
          isCurrentPlaying(recording.id);
          const isCurrent = isCurrentRecording(recording.id);
          $$renderer2.push(`<div${attr_class("recording-card svelte-1uha8ag", void 0, {
            "locked": !day.available,
            "listened": isListened,
            "playing": isCurrent && day.available
          })}${attr_style(hasImage ? `background-image: url(/uploads/${hasImage})` : "")} role="button" tabindex="0"><div class="card-top svelte-1uha8ag"><div class="card-time svelte-1uha8ag">${escape_html(formatTime(recording.recorded_at))}</div> <div class="card-author svelte-1uha8ag">`);
          Avatar($$renderer2, { avatar: recording.avatar, size: "small" });
          $$renderer2.push(`<!----> <span class="pseudo svelte-1uha8ag">${escape_html(recording.pseudo)}</span></div></div> `);
          if (day.available) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<div class="card-center-duration svelte-1uha8ag">`);
            {
              $$renderer2.push("<!--[-1-->");
              $$renderer2.push(`<span class="duration svelte-1uha8ag">${escape_html(formatDuration(recording.duration_seconds))}</span>`);
            }
            $$renderer2.push(`<!--]--> `);
            {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div> `);
            if (recording.url) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<div class="url-link-container svelte-1uha8ag"><a${attr("href", recording.url)} target="_blank" rel="noopener noreferrer" class="url-link svelte-1uha8ag">Ouvrir le lien</a></div>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--> <div class="card-bottom-player svelte-1uha8ag">`);
            if (hasImage) {
              $$renderer2.push("<!--[0-->");
              $$renderer2.push(`<button class="card-thumbnail svelte-1uha8ag" aria-label="Voir l'image"><img${attr("src", `/uploads/${stringify(hasImage)}`)} alt="" class="svelte-1uha8ag"/></button>`);
            } else {
              $$renderer2.push("<!--[-1-->");
            }
            $$renderer2.push(`<!--]--></div>`);
          } else {
            $$renderer2.push("<!--[-1-->");
            $$renderer2.push(`<div class="card-center-locked svelte-1uha8ag"><span class="lock-icon svelte-1uha8ag">🔒</span> <span class="locked-text svelte-1uha8ag">Reviens demain à ${escape_html(data.threshold)}</span></div>`);
          }
          $$renderer2.push(`<!--]--></div>`);
        }
        $$renderer2.push(`<!--]--></div></div></section>`);
      }
      $$renderer2.push(`<!--]--> <div class="load-more svelte-1uha8ag">`);
      if (data.hasMore) {
        $$renderer2.push("<!--[2-->");
        $$renderer2.push(`<button class="btn svelte-1uha8ag">Charger plus</button>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    ImageViewer($$renderer2, {
      imageUrl: selectedImageUrl,
      isOpen: selectedImageUrl !== null,
      onClose: () => selectedImageUrl = null
    });
    $$renderer2.push(`<!---->`);
  });
}
export {
  _page as default
};
