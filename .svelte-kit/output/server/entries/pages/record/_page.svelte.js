import { s as store_get, c as attr_class, e as ensure_array_like, b as stringify, u as unsubscribe_stores } from "../../../chunks/index2.js";
import "browser-image-compression";
import { e as escape_html, a as attr } from "../../../chunks/attributes.js";
import { p as playerStore } from "../../../chunks/player.js";
import { I as ImageViewer } from "../../../chunks/ImageViewer.js";
/* empty css                      */
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let timer = 0;
    let userRecordings = [];
    let isLoadingRecordings = false;
    let player = {
      ...store_get($$store_subs ??= {}, "$playerStore", playerStore)
    };
    let selectedImageUrl = null;
    function formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    }
    function formatDuration(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    $$renderer2.push(`<div class="container svelte-1seusva"><h1 class="svelte-1seusva">Enregistrer</h1> `);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div class="recorder svelte-1seusva"><div${attr_class(`timer ${stringify("")} ${stringify("")}`, "svelte-1seusva")}>${escape_html(formatTime(timer))} / 3:00</div> `);
      {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--> `);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<button class="record svelte-1seusva">Commencer l'enregistrement</button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (userRecordings.length > 0) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="recordings-section svelte-1seusva"><h2 class="svelte-1seusva">Mes enregistrements</h2> <div class="recordings-list svelte-1seusva"><!--[-->`);
      const each_array = ensure_array_like(userRecordings);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let recording = each_array[$$index];
        const isCurrentlyPlaying = player.currentRecording?.id === recording.id && player.isPlaying;
        $$renderer2.push(`<div class="recording-item svelte-1seusva">`);
        if (recording.image_filename) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<button class="recording-thumb svelte-1seusva" aria-label="Voir l'image"><img${attr("src", `/uploads/${stringify(recording.image_filename)}`)} alt="" class="svelte-1seusva"/></button>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<div class="recording-thumb recording-thumb-empty svelte-1seusva">🎙️</div>`);
        }
        $$renderer2.push(`<!--]--> <div class="recording-info svelte-1seusva"><span class="recording-date svelte-1seusva">${escape_html(formatDate(recording.recorded_at))}</span> <span class="recording-duration svelte-1seusva">${escape_html(formatDuration(recording.duration_seconds))}</span></div> <div class="recording-actions svelte-1seusva">`);
        if (recording.url) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<a${attr("href", recording.url)} target="_blank" rel="noopener noreferrer" class="url-btn svelte-1seusva" aria-label="Ouvrir le lien">🔗</a>`);
        } else {
          $$renderer2.push("<!--[-1-->");
          $$renderer2.push(`<span class="url-placeholder svelte-1seusva"></span>`);
        }
        $$renderer2.push(`<!--]--> <button class="listen-btn svelte-1seusva" aria-label="Écouter">${escape_html(isCurrentlyPlaying ? "⏸️" : "▶️")}</button> <button class="delete-btn svelte-1seusva" aria-label="Supprimer">🗑️</button></div></div>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<button class="btn svelte-1seusva"${attr("disabled", isLoadingRecordings, true)}>${escape_html("Charger plus")}</button>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    ImageViewer($$renderer2, {
      imageUrl: selectedImageUrl,
      isOpen: selectedImageUrl !== null,
      onClose: () => selectedImageUrl = null
    });
    $$renderer2.push(`<!---->`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
