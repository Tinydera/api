"use strict";
const app = require("express");
const api = app.Router();
const {
    db,
    listCases,
    listMethods,
    listOrganizations,
    SEARCH,
    CASE
} = require("../../helpers/db");

const {
    parseAPIGetParams,
} = require("./api-things");   

api.use('/v1', api); 
api.get("/", async function(req, res) {

    res.status(200).json({});
})

api.get("/cases", async function(req, res) {
    const params = parseAPIGetParams(req);
    if(params.error) {
        return res.status(400).json({
            error: params.error,
        });
    }
    const results = await db.any(CASE, {
        query: '',
        limit: params.limit, // null is no limit in SQL
        offset: params.skip,
        language: params.locale,
        userId: '418161', // req.user ? req.user.id : null,
        sortby: params.sortKey,
        type: 'cases',
        facets: ''
      }).catch(err => {
          console.log(err);
      });
      console.log(results);
    res.status(200).json({
        OK: true,
        results,
    });
})
module.exports = api;
