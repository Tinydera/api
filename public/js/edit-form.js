import serialize from "./utils/serialize.js";
import loadingGifBase64 from "./loading-gif-base64.js";
import modal from "./modal.js";
import infoIconToModal from "./info-icon-to-modal.js";
import tracking from "./utils/tracking.js";
import languageSelectTooltipForNewEntries from "./language-select-tooltip-for-new-entries.js";
import languageSelectTooltipForNewEntryInput from "./language-select-tooltip-for-new-entry-input";

import submitFormLanguageSelector from "./submit-form-language-selector";
import tabsWithCards from "./tabs-with-cards.js";

const editForm = {
  init() {
    // bind event listener for publish buttons clicks
    const submitButtonEls = document.querySelectorAll("[type=submit]");

    // reference to all forms
    this.localForms = document.querySelectorAll("form[data-local=local]");

    if (!submitButtonEls) return;

    // this is a counter to keep track of publishing attempts
    // if the server returns with a 408 or a 503 (timeout errors)
    // we want to automatically retry a max of MAX_PUBLISH_ATTEMPTS
    // this is a stopgap to improve ux until we fix the underlying server issues.
    this.MAX_PUBLISH_ATTEMPTS = 10;
    this.publishAttempts = 0;

    for (let i = 0; i < submitButtonEls.length; i++) {
      submitButtonEls[i].addEventListener("click", event => {
        event.preventDefault();
        // set flag so we can check in the unload event if the user is actually trying to submit the form
        try {
          window.sessionStorage.setItem("submitButtonClick", "true");
        } catch (err) {
          console.warn(err);
        }

        this.sendFormData();
      });
    }

    // if this page was loaded with the refreshAndClose param, we can close it programmatically
    // this is part of the flow to refresh auth state
    if (window.location.search.indexOf("refreshAndClose") > 0) {
      window.close();
    }

    // do full version click
    const fullVersionButtonEls = document.querySelectorAll(
      ".js-do-full-version"
    );
    const handleFullVersionClick = fullVersionButtonEl => {
      fullVersionButtonEl.addEventListener("click", e => {
        e.preventDefault();
        const articleEl = document.querySelector("[data-submit-type]");
        // change submit type attribute
        articleEl.setAttribute("data-submit-type", "full");
        // update url param
        history.pushState({}, document.title, `${window.location.href}?full=1`);
        // scroll to top
        window.scrollTo(0, 0);
      });
    };
    fullVersionButtonEls.forEach(el => handleFullVersionClick(el));

    this.initOtherLangSelector();

    infoIconToModal.init();
    // this.initPinTabs();

    this.formEl = document.querySelector(".js-edit-form");

    if (this.localForms) {
      this.initLocalForms();
    }
    // Stopped initialization of new entries due to languageSelectTooltipForNewEntryInput init.
    // languageSelectTooltipForNewEntries.init();
    languageSelectTooltipForNewEntryInput.init();
    submitFormLanguageSelector.init();
  },

  initLocalForms() {
    // reference to all forms
    // bind event listener for publish buttons clicks
    const submitButtonEls = document.querySelectorAll("[type=submit]");
    for (let i = 0; i < submitButtonEls.length; i++) {
      const submitBtn = submitButtonEls[i];
      submitBtn.addEventListener("click", () => {
        // submit button clicked, validate forms
        this.validateLocalForms();
      });
    }
    tabsWithCards.init();
  },

  initOtherLangSelector() {
    this.currentInputValue = '';
    this.entryLocaleData = {
      title: {},
      description: {},
      body: {},
    };

      const selectors = document.querySelectorAll(
        "select.js-edit-select[name=languages]"
      );
      const selectorLoaders = document.querySelectorAll(".js_other_lang_select");
      const inputFields = document.querySelectorAll(
        "select.js-edit-select[name=languages]+input, select.js-edit-select[name=languages]+textarea");
        const bodyField = document.querySelector(".ql-editor");
        console.log(bodyField);
        bodyField.addEventListener("keyup", (evt) => {
          console.log(evt.target.innerHTML);
          this.entryLocaleData['body'][this.field] = evt.target.innerHTML;
        });
        inputFields.forEach(input => {
          input.addEventListener("focus", (evt) => {
            this.currentInputValue = evt.target.value;
            this.currentInput = evt.target.name;
          });
          input.addEventListener("keyup", (evt) => {
            this.currentInputValue = evt.target.value;
            this.currentInput = evt.target.name;
            if(this.field) {
              this.entryLocaleData[this.inputName][this.field] = this.currentInputValue;
            }
          });
        });

      console.log(inputFields);
      selectorLoaders.forEach(el => {
        el.addEventListener("click", evt => {
          evt.preventDefault();

          const field = evt.target.dataset;
          console.log(field);
          el.nextElementSibling.classList.toggle("is-visible");
        });
      });

      selectors.forEach(el => {
        el.addEventListener("change", evt => {
          evt.preventDefault();

          const isBody = el.nextElementSibling.className.includes('ql-toolbar');
          this.field = evt.target.value;
          this.inputName = isBody ? 'body' : el.nextElementSibling.name;
          const inputField = isBody ? bodyField : el.nextElementSibling;

          console.log(this.field, this.inputName);
          if(this.entryLocaleData[this.inputName] && this.entryLocaleData[this.inputName][this.field]){
            // if(this.field === "title" || this.field === "description"){
              if(isBody) {
                inputField.innerHTML = this.entryLocaleData[this.inputName][this.field];
              } else {
                inputField.value = this.entryLocaleData[this.inputName][this.field];
              }
            // }
          } else {
            this.entryLocaleData[this.inputName][this.field] = ''
            if(isBody) {
              inputField.innerHTML = this.entryLocaleData[this.inputName][this.field];
            } else {
              inputField.value = this.entryLocaleData[this.inputName][this.field];
            }
          }
        });
      });
  },

  validateLocalForms() {},

  initPinTabs() {
    const tabsContainer = document.querySelector(".js-tab-items");
    const mobileTabsContainer = document.querySelector(
      ".js-tab-select-container"
    );
    document.addEventListener("scroll", e => {
      console.log(window.scrollY);
      if (window.scrollY > 25) {
        tabsContainer.classList.add("fixed-language-tab");
      } else {
        tabsContainer.classList.remove("fixed-language-tab");
      }
      if (window.scrollY > 30) {
        mobileTabsContainer.classList.add("fixed-language-tab");
      } else {
        mobileTabsContainer.classList.remove("fixed-language-tab");
      }
    });
  },

  sendFormData() {
    const formData = serialize(this.formEl);
    const originalEntry = Object.fromEntries(new URLSearchParams(formData));
    const formObject = Object.fromEntries(new URLSearchParams(formData));
    const formsData = {};
    const supportedLanguages = JSON.parse(this.formEl.supportedLangs.value) || [];

    supportedLanguages.forEach(lang => {

      formsData[lang.key] = formObject;
      formsData[lang.key]['title'] = this.entryLocaleData['title']?.[lang.key] || '';
      formsData[lang.key]['description'] = this.entryLocaleData['description']?.[lang.key] || '';
      formsData[lang.key]['body'] = this.entryLocaleData['body']?.[lang.key] || '';
    });
    // const formsData = {};
    // this.localForms.forEach(form => {
    //   formsData[form.dataset["lang"]] = serialize(form);
    // });
    const xhr = new XMLHttpRequest();
    xhr.open("POST", this.formEl.getAttribute("action"), true);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.onreadystatechange = () => {
      // wait for request to be done
      if (xhr.readyState !== xhr.DONE) return;

      if (xhr.status === 0) {
        // if user is not logged in
        // this.openAuthWarning();
        window.sessionStorage.setItem("submitButtonClick", "true");
        window.location.href = "/logout";
      } else if (xhr.status === 413) {
        // if file uploads are too large
        this.handleErrors([
          "Sorry your files are too large. Try uploading one at at time or uploading smaller files (50mb total).",
        ]);
      } else if (xhr.status === 408 || xhr.status === 503) {
        // handle server unavailable/request timeout errors
        // rather than showing
        if (this.publishAttempts < this.MAX_PUBLISH_ATTEMPTS) {
          this.sendFormData();
          this.publishAttempts++;
        } else {
          this.handleErrors(null);
        }
      } else {
        const response = JSON.parse(xhr.response);
        if (response.OK) {
          this.handleSuccess(response);
        } else {
          this.handleErrors(response.errors);
        }
      }
    };

    xhr.send(JSON.stringify({...formsData, entryLocales: this.entryLocaleData, originalEntry}));
    // open publishing feedback modal as soon as we send the request
    this.openPublishingFeedbackModal();
  },

  openAuthWarning() {
    const content = `
      <h3>It looks like you're not logged in...</h3>
      <p>Click the button below to refresh your session in a new tab, then you'll be redirected back here to save your changes.</p>
      <a href="/login?refreshAndClose=true" target="_blank" class="button button-red js-refresh-btn">Refresh Session</a>
    `;
    modal.updateModal(content);
    modal.openModal("aria-modal");
    document.querySelector(".js-refresh-btn").addEventListener("click", () => {
      try {
        window.sessionStorage.setItem("submitButtonClick", "false");
      } catch (err) {
        console.warn(err);
      }
      modal.closeModal();
    });
  },

  openPublishingFeedbackModal() {
    const content = `
      <div class="loading-modal-content">
        <h3>Publishing</h3>
        <img src=${loadingGifBase64} />
      </div>
    `;
    modal.updateModal(content);
    modal.openModal("aria-modal");
  },

  handleSuccess(response) {
    if (response.user) {
      // track user profile update and redirect to user profile
      tracking.sendWithCallback("user", "update_user_profile", "", () => {
        // redirect to user profile page
        location.href = `/user/${response.user.id}`;
      });
    } else if (response.article) {
      const isNew = this.formEl.getAttribute("action").indexOf("new") > 0;
      const eventAction = isNew ? "create_new_article" : "update_article";
      const eventLabel = response.article.type;

      // track publish action then redirect to reader page
      tracking.sendWithCallback("articles", eventAction, eventLabel, () => {
        // redirect to article reader page
        location.href = `/${response.article.type}/${response.article.id}`;
      });
    }
  },

  errorModalHtml(errors) {
    if (!Array.isArray(errors)) {
      return `<h3>Sorry, something went wrong. Please try again.</h3>`;
    } else {
      const errorsHtml = errors.map(error => `<li>${error}</li>`).join("");
      return `
        <h3>Please fix the following issues</h3>
        <ul>
          ${errorsHtml}
        </ul>
      `;
    }
  },

  handleErrors(errors) {
    const content = this.errorModalHtml(errors);
    modal.updateModal(content);
    modal.openModal("aria-modal", { showCloseBtn: true });
  },
};

export default editForm;
