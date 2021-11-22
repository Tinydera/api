
import modal from "./modal.js";

const showMessageOnClick = {
    init() {
      const containerEl = document.querySelector(".js-show-verified-info-container");
      const isAdmin = document.querySelector(".js-is-admin") ? JSON.parse(document.querySelector(".js-is-admin").value) : false;
      console.log(isAdmin);
      if (!containerEl) return;
  
      containerEl.addEventListener("click", e => {
        const button = e.target.closest(".js-show-verified-info-trigger");
        
        if (button) {
          if (isAdmin) {
            window.open(window.location.href + "/edit", "_self");
          } else {
          this.openPublishingFeedbackModal();
          }
        }
      });
    },

    openPublishingFeedbackModal() {
      const content = `
      <p>This entry has been reviewed by our Editorial Board and can no longer be edited. If you would like to suggest changes to this entry, please <a href="mailto:info@participedia.net">contact us</a>.</p>
      `;
      modal.updateModal(content);
      modal.openModal("aria-modal");
    },
  };

  
  export default showMessageOnClick;
  