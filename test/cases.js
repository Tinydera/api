let tokens = require("./setupenv");
let app = require("../app");
let chai = require("chai");
let chaiHttp = require("chai-http");
let chaiHelpers = require("./helpers");
chai.should();
chai.use(chaiHttp);
chai.use(chaiHelpers);

let location = {
  label: "Cleveland, OH, United States",
  placeId: "ChIJLWto4y7vMIgRQhhi91XLBO0",
  isFixture: false,
  gmaps: {
    address_components: [
      {
        long_name: "Cleveland",
        short_name: "Cleveland",
        types: ["locality", "political"]
      },
      {
        long_name: "Cuyahoga County",
        short_name: "Cuyahoga County",
        types: ["administrative_area_level_2", "political"]
      },
      {
        long_name: "Ohio",
        short_name: "OH",
        types: ["administrative_area_level_1", "political"]
      },
      {
        long_name: "United States",
        short_name: "US",
        types: ["country", "political"]
      }
    ],
    formatted_address: "Cleveland, OH, USA",
    geometry: {
      bounds: {
        south: 41.390628,
        west: -81.87897599999997,
        north: 41.604436,
        east: -81.53274390000001
      },
      location: {
        lat: 41.49932,
        lng: -81.69436050000002
      },
      location_type: "APPROXIMATE",
      viewport: {
        south: 41.390628,
        west: -81.87897599999997,
        north: 41.5992571,
        east: -81.53274390000001
      }
    },
    place_id: "ChIJLWto4y7vMIgRQhhi91XLBO0",
    types: ["locality", "political"]
  },
  location: {
    lat: 41.49932,
    lng: -81.69436050000002
  }
};

describe("Cases", () => {
  describe("Lookup", () => {
    it("finds case 100", done => {
      chai.getJSON("/case/100").send({}).end((err, res) => {
        res.should.have.status(200);
        done();
      });
    });
  });
  describe("Adding", () => {
    it("fails without authentication", done => {
      chai.postJSON("/case/new").send({}).end((err, res) => {
        res.should.have.status(401);
        done();
      });
    });
    it("fails without content", done => {
      chai
        .postJSON("/case/new")
        .set("Authorization", "Bearer " + tokens.user_token)
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });
    it("works with authentication", done => {
      chai
        .postJSON("/case/new")
        .set("Authorization", "Bearer " + tokens.user_token)
        .send({
          // mandatory
          title: "This is the first title of the rest of your post",
          body: "Eat this, it is my body",
          // optional
          lead_image: "CitizensAssembly_2.jpg", // key into S3 bucket
          vidURL: "https://www.youtube.com/watch?v=QF7g3rCnD-w",
          location: location,
          relatedCases: ["1", "2", "3", "4"],
          relatedMethods: ["145", "146", "147"],
          relatedOrganizations: ["199", "200", "201"]
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.OK.should.be.true;
          res.body.data.case_id.should.be.a("number");
          done();
        });
    });
  });
  describe("Related Objects", () => {
    it("test related objects empty", done => {
      chai.getJSON("/case/39").send({}).end((err, res) => {
        res.should.have.status(200);
        res.body.data.related_cases.should.have.lengthOf(0);
        res.body.data.related_methods.should.have.lengthOf(0);
        res.body.data.related_organizations.should.have.lengthOf(0);
        done();
      });
    });
    it("test related objects with single item", done => {
      chai.getJSON("/case/38").send({}).end((err, res) => {
        res.should.have.status(200);
        res.body.data.related_cases.should.have.lengthOf(1);
        res.body.data.related_cases[0].id.should.equal(70);
        res.body.data.related_methods.should.have.lengthOf(1);
        res.body.data.related_methods[0].id.should.equal(170);
        res.body.data.related_organizations.should.have.lengthOf(1);
        res.body.data.related_organizations[0].id.should.equal(270);
        done();
      });
    });
    it("test related objects with multiple items", done => {
      chai.getJSON("/case/37").send({}).end((err, res) => {
        res.should.have.status(200);
        res.body.data.related_cases.should.have.lengthOf(2);
        res.body.data.related_cases[0].id.should.equal(45);
        res.body.data.related_cases[1].id.should.equal(63);
        res.body.data.related_methods.should.have.lengthOf(2);
        res.body.data.related_methods[0].id.should.equal(145);
        res.body.data.related_methods[1].id.should.equal(163);
        res.body.data.related_organizations.should.have.lengthOf(2);
        res.body.data.related_organizations[0].id.should.equal(245);
        res.body.data.related_organizations[1].id.should.equal(263);
        done();
      });
    });
  });
  it("test SQL santization", done => {
    chai
      .postJSON("/case/new")
      .set("Authorization", "Bearer " + tokens.user_token)
      .send({
        // mandatory
        title: "This is the first'); drop table users; -- title of the rest of your post",
        body: "Eat this, '); drop table users; -- it is my body",
        // optional
        lead_image: "CitizensAssembly_2.jpg'); drop table users; --", // key into S3 bucket
        vidURL: "https://www.youtube.com/watch?v=QF7g3rCnD-w'); drop table users; --",
        location: location,
        relatedCases: ["1", "2", "3", "4"],
        relatedMethods: ["145", "146", "147"],
        relatedOrganizations: ["199", "200", "201"]
      })
      .end((err, res) => {
        res.should.have.status(201);
        done();
      });
  });
  // let userID = tokens.user_payload.user_id;
  describe("Counting by country", () => {
    it("returns stuff", done => {
      chai
        .getJSON("/case/countsByCountry")
        .set("Authorization", "Bearer " + tokens.user_token)
        .end((err, res) => {
          let countryCounts = res.body.data.countryCounts;
          countryCounts.should.have.property("france");
          res.should.have.status(200);
          done();
        });
    });
  });
  describe("Get case with tags", () => {
    it("should have 3 tags", done => {
      chai.getJSON("/case/39").end((err, res) => {
        res.body.OK.should.equal(true);
        res.should.have.status(200);
        let the_case = res.body.data;
        the_case.tags.should.have.lengthOf(3);
        the_case.bookmarked.should.equal(false);
        done();
      });
    });
  });
  describe("Get case with authentication", () => {
    it("should not fail when logged in", done => {
      chai
        .getJSON("/case/100")
        .set("Authorization", "Bearer " + tokens.user_token)
        .end((err, res) => {
          res.body.OK.should.equal(true);
          res.should.have.status(200);
          done();
        });
    });
  });
  describe("Test edit API", () => {
    it("Add case, then modify it", async () => {
      const res1 = await chai
        .postJSON("/case/new")
        .set("Authorization", "Bearer " + tokens.user_token)
        .send({
          // mandatory
          title: "First Title",
          body: "First Body",
          // optional
          lead_image: "CitizensAssembly_2.jpg", // key into S3 bucket
          vidURL: "https://www.youtube.com/watch?v=QF7g3rCnD-w",
          location: location,
          relatedCases: ["1", "2", "3", "4"],
          relatedMethods: ["145", "146", "147"],
          relatedOrganizations: ["199", "200", "201"]
        });
      res1.should.have.status(201);
      res1.body.OK.should.be.true;
      res1.body.data.case_id.should.be.a("number");
      const origCase = res1.body.object;
      origCase.id.should.be.a("number");
      origCase.id.should.equal(res1.body.data.case_id);
      const res2 = await chai
        .putJSON("/case/" + res1.body.data.case_id)
        .set("Authorization", "Bearer " + tokens.user_token)
        .send({}); // empty update
      res2.should.have.status(200);
      const updatedCase1 = res2.body.data;
      updatedCase1.should.deep.equal(origCase); // no changes saved
    });
  });
});
