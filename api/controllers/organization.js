"use strict";

const express = require("express");
const cache = require("apicache");
const log = require("winston");
const fs = require("fs");

const {
  db,
  as,
  CREATE_ORGANIZATION,
  ORGANIZATION_EDIT_BY_ID,
  ORGANIZATION_VIEW_BY_ID,
  INSERT_AUTHOR,
  INSERT_LOCALIZED_TEXT,
  UPDATE_ORGANIZATION,
  listUsers,
  listMethods,
  ErrorReporter
} = require("../helpers/db");

const {
  setConditional,
  maybeUpdateUserText,
  parseGetParams,
  returnByType,
  fixUpURLs
} = require("../helpers/things");

const requireAuthenticatedUser = require("../middleware/requireAuthenticatedUser.js");

const ORGANIZATION_STRUCTURE = JSON.parse(
  fs.readFileSync("api/helpers/data/organization-structure.json", "utf8")
);
const sharedFieldOptions = require("../helpers/shared-field-options.js");

async function getEditStaticText(params) {
  let staticText = {};
  const lang = params.lang;

  staticText.authors = await listUsers();
  staticText.methods = await listMethods(lang);

  staticText = Object.assign({}, staticText, sharedFieldOptions);

  return staticText;
}

/**
 * @api {post} /organization/new Create new organization
 * @apiGroup Organizations
 * @apiVersion 0.1.0
 * @apiName newOrganization
 *
 * @apiSuccess {Boolean} OK true if call was successful
 * @apiSuccess {String[]} errors List of error strings (when `OK` is false)
 * @apiSuccess {Object} organization data
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "OK": true,
 *       "data": {
 *         "ID": 3,
 *         "Description": 'foo'
 *        }
 *     }
 *
 * @apiError NotAuthenticated The user is not authenticated
 * @apiError NotAuthorized The user doesn't have permission to perform this operation.
 *
 */
async function postOrganizationNewHttp(req, res) {
  // create new `organization` in db
  try {
    cache.clear();
    let title = req.body.title;
    let body = req.body.body || req.body.summary || "";
    let description = req.body.description;
    let language = req.params.language || "en";
    if (!title) {
      return res.status(400).json({
        OK: false,
        message: "Cannot create Organization without at least a title"
      });
    }
    const user_id = req.user.id;
    const thing = await db.one(CREATE_ORGANIZATION, {
      title,
      body,
      description,
      language
    });
    req.params.thingid = thing.thingid;
    await postOrganizationUpdateHttp(req, res);
  } catch (error) {
    log.error("Exception in POST /organization/new => %s", error);
    return res.status(400).json({ OK: false, error: error });
  }
  // Refresh search index
  // try {
  //   db.none("REFRESH MATERIALIZED VIEW CONCURRENTLY search_index_en;");
  // } catch (error) {
  //   log.error("Exception in POST /organization/new => %s", error);
  // }
}

/**
 * @api {put} /organization/:id  Submit a new version of a organization
 * @apiGroup Organizations
 * @apiVersion 0.1.0
 * @apiName editOrganization
 * @apiParam {Number} id Organization ID
 *
 * @apiSuccess {Boolean} OK true if call was successful
 * @apiSuccess {String[]} errors List of error strings (when `OK` is false)
 * @apiSuccess {Object} organization data
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "OK": true,
 *       "data": {
 *         "ID": 3,
 *         "Description": 'foo'
 *        }
 *     }
 *
 * @apiError NotAuthenticated The user is not authenticated
 * @apiError NotAuthorized The user doesn't have permission to perform this operation.
 *
 */

async function getOrganization(params) {
  const article = (await db.one(ORGANIZATION_VIEW_BY_ID, params)).results;
  fixUpURLs(article);
  keyFieldsToObjects(article);
  return article;
}

function keyFieldsToObjects(article) {
  // probably not needed, eliminate after
  // merging localization branch
}

async function postOrganizationUpdateHttp(req, res) {
  cache.clear();
  const params = parseGetParams(req, "organization");
  const user = req.user;
  const { articleid, type, view, userid, lang, returns } = params;
  const newOrganization = req.body;
  const {
    updatedText,
    author,
    oldArticle: oldOrganization
  } = await maybeUpdateUserText(req, res, "organization", keyFieldsToObjects);
  const [updatedOrganization, er] = getUpdatedOrganization(
    user,
    params,
    newOrganization,
    oldOrganization
  );
  if (!er.hasErrors()) {
    if (updatedText) {
      await db.tx("update-organization", t => {
        return t.batch([
          t.none(INSERT_AUTHOR, author),
          t.none(INSERT_LOCALIZED_TEXT, updatedText),
          t.none(UPDATE_ORGANIZATION, updatedOrganization)
          // t.none("REFRESH MATERIALIZED VIEW search_index_en;")
        ]);
      });
    } else {
      await db.tx("update-organization", t => {
        return t.batch([
          t.none(INSERT_AUTHOR, author),
          t.none(UPDATE_ORGANIZATION, updatedOrganization)
          // t.none("REFRESH MATERIALIZED VIEW search_index_en;")
        ]);
      });
    }
    const freshArticle = await getOrganization(params);
    res.status(200).json({
      OK: true,
      article: freshArticle
    });
  } else {
    console.error("Reporting errors: %s", er.errors);
    res.status(400).json({
      OK: false,
      errors: er.errors
    });
  }
}

function getUpdatedOrganization(
  user,
  params,
  newOrganization,
  oldOrganization
) {
  const updatedOrganization = Object.assign({}, oldOrganization);
  const er = new ErrorReporter();
  const cond = (key, fn) =>
    setConditional(updatedOrganization, newOrganization, er, fn, key);
  // admin-only
  if (user.isadmin) {
    cond("featured", as.boolean);
    cond("hidden", as.boolean);
    cond("original_language", as.text);
    cond("post_date", as.date);
  }
  // media lists
  ["links", "videos", "audio"].map(key => cond(key, as.media));
  // photos and files are slightly different from other media as they have a source url too
  ["photos", "files"].map(key => cond(key, as.sourcedMedia));
  // boolean (would include "published" but we don't really support it)
  ["facilitators"].map(key => cond(key, as.yesno));
  // text
  [
    "location_name",
    "address1",
    "address2",
    "city",
    "province",
    "postal_code",
    "country"
  ].map(key => cond(key, as.text));
  ["latitude", "longitude"].map(key => cond(key, as.float));
  // key
  ["sector"].map(key => cond(key, as.organizationkeyflat));
  // list of keys
  [
    "scope_of_influence",
    "type_method",
    "type_tool",
    "specific_topics",
    "general_issues"
  ].map(key => cond(key, as.organizationkeys));
  // list of article ids
  ["specific_methods_tools_techniques"].map(key => cond(key, as.ids));
  // TODO save bookmarked on user
  return [updatedOrganization, er];
}

async function getOrganizationHttp(req, res) {
  /* This is the entry point for getting an article */
  const params = parseGetParams(req, "organization");
  const articleRow = await db.one(ORGANIZATION_VIEW_BY_ID, params);
  const article = articleRow.results;
  fixUpURLs(article);
  const staticText = {};
  returnByType(res, params, article, staticText);
}

async function getOrganizationEditHttp(req, res) {
  const params = parseGetParams(req, "organization");
  params.view = "edit";
  const articleRow = await db.one(ORGANIZATION_EDIT_BY_ID, params);
  const article = articleRow.results;
  fixUpURLs(article);
  const staticText = await getEditStaticText(params);
  returnByType(res, params, article, staticText);
}

async function getOrganizationNewHttp(req, res) {
  const params = parseGetParams(req, "organization");
  params.view = "edit";
  const article = ORGANIZATION_STRUCTURE;
  const staticText = await getEditStaticText(params);
  returnByType(res, params, article, staticText, req.user);
}

const router = express.Router(); // eslint-disable-line new-cap
router.post("/new", requireAuthenticatedUser(), postOrganizationNewHttp);
router.post(
  "/:thingid",
  requireAuthenticatedUser(),
  postOrganizationUpdateHttp
);
router.get("/:thingid/", getOrganizationHttp);
router.get(
  "/:thingid/edit",
  requireAuthenticatedUser(),
  getOrganizationEditHttp
);
router.get("/new", requireAuthenticatedUser(), getOrganizationNewHttp);

module.exports = {
  organization: router,
  postOrganizationNewHttp,
  postOrganizationUpdateHttp,
  getOrganizationHttp,
  getOrganizationEditHttp,
  getOrganizationNewHttp
};
