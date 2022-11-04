"use strict";
let express = require("express");
let router = express.Router(); // eslint-disable-line new-cap
let cache = require("apicache");
const caseList = require("./case");
let {
  db,
  as,
  TITLES_FOR_THINGS,
  SEARCH,
  FEATURED_MAP,
  FEATURED,
  SEARCH_MAP,
  LIST_MAP_CASES,
  LIST_MAP_ORGANIZATIONS,
  SEARCH_CHINESE,
} = require("../helpers/db");
const {
  supportedTypes,
  parseGetParams,
  searchFiltersFromReq,
  typeFromReq,
  limitFromReq,
  offsetFromReq
} = require("../helpers/things");

const logError = require("../helpers/log-error.js");
const SUPPORTED_LANGUAGES = require("../../constants").SUPPORTED_LANGUAGES
const requireAuthenticatedUser = require("../middleware/requireAuthenticatedUser.js");

const queryFileFromReq = req => {
  const featuredOnly =
    !req.query.query || (req.query.query || "").toLowerCase() === "featured";
  const resultType = (req.query.resultType || "").toLowerCase();
  let queryfile = SEARCH;
  if (featuredOnly && resultType === "map") {
    queryfile = FEATURED_MAP;
  } else if (featuredOnly) {
    queryfile = FEATURED;
  } else if (resultType == "map") {
    queryfile = SEARCH_MAP;
  }
  return queryfile;
};

const sortbyFromReq = req => {
  if (req.query.sortby === "post_date") {
    return "post_date";
  }
  return "updated_date";
};


/**
 * @api {get} /review-entries Show all entries that need to be reviewed
 * @apiGroup review-entries
 * @apiVersion 0.1.0
 * @apiName all-review-entries
 *
 * @apiSuccess {Boolean} OK true if call was successful
 * @apiSuccess {data} User object if call was successful
 * @apiSuccess {String[]} errors List of error strings (when `OK` is false)
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *        OK: true
 *     }
 *
 * @apiError NotAuthenticated The user is not authenticated
 * @apiError NotAuthorized The user doesn't have permission to perform this operation.
 *
 */
 router.get("/review", async function(req, res) {
    const user_query = req.query.query || "";
    const langQuery = SUPPORTED_LANGUAGES.find(element => element.twoLetterCode === "en").name.toLowerCase();
    const type = typeFromReq(req);
    // make sure we have a logged in user
    if (!req.user) {
      return res
        .status(401)
        .json({ error: "You must be logged in to perform this action." });
    }

    try {
      let results = await db.any(queryFileFromReq(req), {
        query: user_query,
        limit: null, // null is no limit in SQL
        offset: offsetFromReq(req),
        language: "en",
        langQuery: langQuery,
        userId: req.user ? req.user.id : null,
        sortby: sortbyFromReq(req),
        type: type + "s",
        facets: searchFiltersFromReq(req),
      });
    
        // const data = await getUserById(userId, req, res, "view");
    
        // if (!data) {
        //   return res.status(404).render("404");
        // }
        let data = results;
        // console.log("data review - " + JSON.stringify(results))
    
        // return html template
        const returnType = req.query.returns || "html";
        if (returnType === "html") {
          return res.status(200).render(`review-entries`, {results});
        } else if (returnType === "json") {
          return res.status(200).json(data);
        }
      } catch (error) {
        console.error("Exception in ",  error.message);
        logError(error);
      }
  });

module.exports = router;