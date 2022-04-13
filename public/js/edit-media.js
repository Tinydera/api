import serialize from "./utils/serialize.js";
import Sortable from "sortablejs";
import modal from "./modal.js";
import { ALLOWED_IMAGE_TYPES } from "../../constants.js";

const toArray = nodeList => Array.prototype.slice.call(nodeList);

const editMedia = {
  init() {
    const dropAreaEls = document.querySelectorAll(
      ".js-edit-media-drag-drop-area"
    );

    dropAreaEls.forEach(el => {
      el.addEventListener("drop", ev => this.handleDrop(ev));
      el.addEventListener("dragover", ev => this.handleDragOver(ev));
      el.addEventListener("dragenter", ev => this.toggleDropAreaClass(ev));
      el.addEventListener("dragleave", ev => this.toggleDropAreaClass(ev));
      
      el.addEventListener("click", ev => {
        // if user clicks anywhere on drag/drop area, trigger file upload handling
        el.querySelector("input[type=file]").click();
      });

      // on input change event
      el.querySelector("input[name^='temporary-']").addEventListener(
        "change",
        ev => this.handleInputChange(ev)
      );

      // event delegation for deleting files
      el.closest(".form-group").addEventListener("click", ev =>
        this.deleteFile(ev)
      );
    });

    this.initSortableLists();
  },

  openNotSupportedImageTypeErrorModal(filename) {
    const errorTemplate = document.querySelector(
      ".js-edit_media_not_supported_file_type_error"
    ).innerHTML;
    const errorEl = document.createElement("p");
    errorEl.innerHTML = errorTemplate;
    errorEl.querySelector(
      ".js-edit_media_not_supported_file_type_error__file-name"
    ).innerHTML = filename;
    modal.updateModal(errorEl.innerHTML);
    modal.openModal("aria-modal");
  },

  handleInputChange(ev) {
    this.renderUploadedFiles(ev.target);
  },

  toggleDropAreaClass(ev) {
    ev.target.classList.toggle("drop-area-drag-over");
  },

  handleDrop(ev) {
    ev.preventDefault();
    this.toggleDropAreaClass(ev);

    const files = ev.dataTransfer.files;
    const fileInputEl = ev.target.querySelector("input[name^='temporary-']");
    fileInputEl.files = files;
    this.renderUploadedFiles(fileInputEl);
  },

  setImageSrcAndFileValue(file, type, listEl, itemIndex) {
    const reader = new FileReader();
    const fileItemEl = listEl.querySelector(`[data-index="${itemIndex}"]`);

    reader.addEventListener(
      "load",
      () => {
        // set img src if type === 'image'
        // set value of file input to file value
        if (type === "image") {
          fileItemEl.querySelector("img").src = reader.result;
        }
        fileItemEl.querySelector("input[data-attr='url']").value =
          reader.result;
      },
      false
    );

    reader.readAsDataURL(file);
  },

  clearAndHideLastItem(fileItemEl) {
    // clear image src
    const img = fileItemEl.querySelector("img");
    if (img) {
      img.setAttribute("src", "");
    }

    // clear all inputs
    fileItemEl.querySelectorAll("input").forEach(el => {
      el.name = `${name}[0][${el.getAttribute("data-attr")}]`;
      el.value = "";
    });

    // hide item
    fileItemEl.style.display = "none";
  },

  renderUploadedFiles(fileInputEl) {
    const listEl = fileInputEl
      .closest(".form-group")
      .querySelector(".js-edit-media-file-list");
    const type = listEl.closest("ol").getAttribute("data-type");
    const name = listEl.getAttribute("data-name");
    const template = document.querySelector(
      `.js-edit-media-file-inputs-template-${name}`
    );
    const files = fileInputEl.files;

    // for each uploaded file, show the set of inputs as defined in the script/template element
    for (let i = 0; i < files.length; i++) {
      // if file type is an image and is not a supported image type
      // show modal to give user feedback
      // then, remove file from list, and skip to next file
      if (
        name === "photos" &&
        !ALLOWED_IMAGE_TYPES.includes(files[i].type)
      ) {
        this.openNotSupportedImageTypeErrorModal(files[i].name);
        delete files[i];
        continue;
      }

      const fileItemEl = document.createElement("div");
      const itemIndex = listEl.querySelectorAll(".js-edit-media-file-list-item")
        .length;

      fileItemEl.innerHTML = template.innerHTML;

      // set file name value on title field as a placeholder
      const titleInputEl = fileItemEl.querySelector("input[data-attr='title']");
      titleInputEl.value = files[i].name;

      // on all inputs set name to reflect index of item
      fileItemEl.querySelectorAll("input").forEach(el => {
        // ie: files[0]url
        el.name = `${name}[${itemIndex}][${el.getAttribute("data-attr")}]`;
      });

      fileItemEl.querySelector("li").setAttribute("data-index", itemIndex);

      listEl.insertAdjacentElement("beforeend", fileItemEl.querySelector("li"));

      // the file data has tp be read async so these need to be
      // set after the elements are in the dom.
      // set img src if type === 'image'
      // set value of file input to file value
      this.setImageSrcAndFileValue(files[i], type, listEl, itemIndex);
    }
   
    const updatedForm = document.querySelector(".js-edit-form");
    var formsData = {};
      const formData = serialize(updatedForm);
      const originalEntry = Object.fromEntries(new URLSearchParams(formData));

      [
        "links", "videos", "audio", "evaluation_links", "general_issues", "collections",
        "specific_topics", "purposes", "approaches", "targeted_participants",
        "method_types", "tools_techniques_types", "participants_interactions",
        "learning_resources", "learning_resources", "decision_methods", "if_voting",
        "insights_outcomes", "organizer_types", "funder_types", "change_types", "files", "photos",
        "implementers_of_change", "evaluation_reports"
      ].map(key => {
        let formKeys = Object.keys(originalEntry);
        let formValues = originalEntry;
        if (!formKeys) return;
        const matcher = new RegExp(
          `^(${key})\\[(\\d{1,})\\](\\[(\\S{1,})\\])?`
        );
        let mediaThingsKeys = formKeys.filter(key => matcher.test(key));
        if(mediaThingsKeys.length === 0) {
          originalEntry[key] = [];
        }
        mediaThingsKeys.forEach(thingKey => {
          const thingValue = formValues[thingKey];
          let m = matcher.exec(thingKey);
          if (!m) return;
          // This is necessary to avoid infinite loops with zero-width matches
          if (m.index === matcher.lastIndex) {
            matcher.lastIndex++;
          }
  
          if(m[1] === 'collections') {
            formValues[m[1]] = formValues[m[1]] || [];
            formValues[m[1]].push(thingValue);
            formValues[m[1]] = Array.from(new Set(formValues[m[1]]));
          } else {
            formValues[m[1]] = formValues[m[1]] || [];
            formValues[m[1]][m[2]] =
              formValues[m[1]][m[2]] === undefined
                ? {}
                : formValues[m[1]][m[2]];
            formValues[m[1]][m[2]][m[4]] = thingValue;
          }
          
        });
      });

      formsData = originalEntry;

      const xhr = new XMLHttpRequest();
      xhr.open("POST", updatedForm.getAttribute("action") + "/saveDraft", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(
        JSON.stringify({
        ...formsData,
        // originalEntry,
      })
    );
     // clear temp input value and use hidden fields as source of truth for files to be uploaded
     fileInputEl.value = "";
  },

  deleteFile(ev) {
    const buttonEl = ev.target.closest("button");
    const isRemoveClick =
      buttonEl &&
      buttonEl.classList.contains("js-edit-media-file-list-remove-item");
    if (isRemoveClick) {
      ev.preventDefault();
      const liEl = ev.target.closest("li");
      const listEl = liEl.closest("ol");

      // if it's the last item, don't remove it, just clear the field values and hide it
      // we need to send up empty fieldset data in order to delete it
      if (
        listEl.querySelectorAll(".js-edit-media-file-list-item").length === 1
      ) {
        this.clearAndHideLastItem(liEl);
      } else {
        liEl.parentNode.removeChild(liEl);
      }
      this.updateNameAttrOnFileUploadInputs(listEl);
    }
  },

  updateNameAttrOnFileUploadInputs(listEl) {
    const liEls = listEl.querySelectorAll(".js-edit-media-file-list-item");
    const name = listEl.getAttribute("data-name");
    liEls.forEach((el, index) => {
      const inputEls = el.querySelectorAll("input");
      // on all inputs set name to reflect index of item
      inputEls.forEach(el => {
        // ie: files[0][url]
        el.name = `${name}[${index}][${el.getAttribute("data-attr")}]`;
      });
    });
  },

  handleDragOver(ev) {
    // prevent default, prevent file from being opened
    ev.preventDefault();
  },

  initSortableLists() {
    const fileInputLists = toArray(
      document.querySelectorAll(".js-edit-media-file-list")
    );

    fileInputLists.forEach(el => {
      if (el.getAttribute("data-draggable")) {
        Sortable.create(el, {
          swapThreshold: 1,
          animation: 150,
          draggable: "li",
          onEnd: e => this.updateIndexes(e),
        });
      }
    });
  },

  updateIndexes(e) {
    e.preventDefault();
    const name = e.target.getAttribute("data-name");
    const fileItems = document.querySelectorAll(
      `.js-edit-media-file-list[data-name=${name}] .js-edit-media-file-list-item`
    );

    fileItems.forEach((el, i) => {
      toArray(el.querySelectorAll("input")).forEach(inputEl => {
        const key = inputEl.getAttribute("data-attr");
        inputEl.name = `${name}[${i}][${key}]`;
      });
    });
  },
};

export default editMedia;
