const moment = require("moment");
const faqContent = require("./faq-content.js");

function mapIdTitleToKeyValue(options) {
  if (!options) return null;
  return options.map(item => {
    return {
      key: item.id,
      value: item.title,
    };
  });
}

function staticTextValue(staticText, name, type = null) {
  let key;
  if (type) {
    key = `${name}_${type}`;
  } else {
    key = name;
  }

  if (staticText.labels) {
    return staticText.labels[key] || key;
  } else {
    // this makes the static keys work on the reader view for now
    // since the format is different from the edit view
    return staticText[key] || key;
  }
}

module.exports = {
  label: (staticText, name) => staticTextValue(staticText, name, "label"),
  info: (staticText, name) => staticTextValue(staticText, name, "info"),
  instructional: (staticText, name) => staticTextValue(staticText, name, "instructional"),
  placeholder: (staticText, name) => staticTextValue(staticText, name, "placeholder"),
  staticText: (staticText, name) => staticTextValue(staticText, name),
  isEmptyArray: (article, name) => {
    const value = article[name];
    if (value && value.constructor === Array) {
      return value.length === 0;
    }
  },
  isArray: (article, name) => {
    const value = article[name];
    return value && value.constructor === Array;
  },
  getvalue: (article, name) => {
    const item = article[name];
    if (item && item.hasOwnProperty("value")) {
      // if the item is an object with a value key, return that
      return item.value;
    } else {
      // otherwise just return the item
      return item;
    }
  },
  hasValue: (article, name) => {
    const item = article[name];

    // potential falsey values
    // null
    // ""
    // []
    // { "value": "" }

    return item !== null &&
           item !== "" &&
           !(item.hasOwnProperty("length") && item.length === 0) &&
           !(item.hasOwnProperty("value") && item.value === "");
  },
  getKey: (article, name) => {
    if (article[name]) {
      return  article[name].key;
    }
  },
  getArticleKey: (article, name, key) => {
    return article[name] && article[name][key];
  },
  isSelectedInArray: (article, name, optionKey) => {
    const options = article[name];
    if (options && options.length > 0) {
      return options.find((item) => {
        return item.key === optionKey;
      });
    }
  },
  isSelected: (article, name, optionKey) => {
    const options = article[name];
    if (options) {
      return options.key === optionKey;
    }
  },
  getStaticOptions: (staticText, name) => {
    // has_components and is_component_of fields use the cases options
    // uses mapIdTitleToKeyValue function to map id/title keys to key/value keys
    if (name === "has_components" || name === "is_component_of") {
      return mapIdTitleToKeyValue(staticText["cases"]);
    } else if (name === "specific_methods_tools_techniques") {
      return mapIdTitleToKeyValue(staticText["methods"]);
    } else {
      return staticText[name];
    }
  },
  getOptions: (article, name) => {
    return article[name];
  },
  getLinkSetValue(article, name, index, attr) {
    if (!article[name]) return;
    if (!article[name][index]) return;
    return article[name][index][attr];
  },
  linkSetFieldName(name, index, attr) {
    return `${name}[${index}][${attr}]`;
  },
  linkSetPlaceholder(staticText, name, attr) {
    return staticTextValue(staticText, `${name}_${attr}`, "placeholder");
  },
  linkSetLabel(staticText, name, attr) {
    return staticTextValue(staticText, `${name}_${attr}`, "label");
  },
  linkSetInstructional(staticText, name, attr) {
    return staticTextValue(staticText, `${name}_${attr}`, "instructional");
  },
  formatDate(article, name, format) {
    return moment(article[name]).format(format);
  },
  getCaseEditSubmitType(req) {
    if (req.query.full === "1") {
      return "full";
    } else {
      return "quick";
    }
  },
  getFaqContent() {
    // todo: get this as translated text from the server
    return faqContent;
  },
  toUpperCase(text) {
    return text.toUpperCase();
  },
  shareLink(type, req) {
    const path = req.originalUrl;
    const host = req.headers.host;
    const url = `https://${host}${path}`;

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/home?status=${url}`,
      linkedIn: `https://www.linkedin.com/shareArticle?mini=true&url=${url}`,
    };
    return shareUrls[type];
  },
  hasPhoto(article) {
    return article.photos && article.photos.length > 0;
  },
  getFirstPhotoUrl(article) {
    if (article.photos < 1) return;
    return article.photos[0].url;
  },
  currentUrl(req) {
    const path = req.originalUrl;
    const host = req.headers.host;
    return `https://${host}${path}`;
  },
};
