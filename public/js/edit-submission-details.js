import autocomplete from "autocompleter";

const editSubmissionDetails = {
  init() {
    const firstSubmittedAutoCompleteEl = document.querySelector(
      "#js-creator-name"
    );
    const firstSubmittedHiddenEl = document.querySelector(
      "input[name=creator]"
    );
   
    if (!firstSubmittedAutoCompleteEl) return; // if submission field not present, don't continue

    // get author data from ui
    const authors = this.getAuthorData();

    // first submitted
    this.initAutocompleteField(
      firstSubmittedAutoCompleteEl,
      firstSubmittedHiddenEl,
      authors
    );

    this.bindEditBtn();
  },

  bindEditBtn() {
    const editBtn = document.querySelector(".js-edit-submission-details-btn");
    editBtn.addEventListener("click", e => {
      e.preventDefault();
      // show edit ui
      document.querySelector(".js-admin-edit-submission-details").style =
        "display: block";

      // hide edit button
      e.target.style = "display: none";
    });
  },

  getAuthorData() {
    const authorsLiEls = document.querySelectorAll(".js-author-list li");
    const authors = Array.prototype.slice.call(authorsLiEls).map(el => {
      return {
        value: el.getAttribute("data-user-id"),
        label: el.innerText,
      };
    });
    return authors;
  },

  initAutocompleteField(autocompleteEl, hiddenEl, authors) {
    autocomplete({
      minLength: 1,
      input: autocompleteEl,
      fetch: function(text, update) {
        const suggestions = authors.filter(n =>
          n.label.toLowerCase().startsWith(text.toLowerCase())
        );
        update(suggestions);
      },
      onSelect: function(item) {
        // set label on input
        autocompleteEl.value = item.label;
        // set value on hidden el
        hiddenEl.value = item.value;
      },
    });
  },
};

export default editSubmissionDetails;
