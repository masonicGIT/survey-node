const Promise = require("bluebird");
const expect = require("chai").expect;
const supertest = require("supertest-promised");
const parseXML = require("xml-parser");
const find = require("lodash/find");
const app = require("../app");
const SurveyResponse = require("../models/SurveyResponse");
const agent = supertest(app);

describe("GET /message", function() {
  beforeEach(function() {
    function clearDb() {
      return SurveyResponse.remove({})
    }

    function step1() {
      return agent.post("/message")
        .type("form")
        .send({
          From: "+15555555555",
          Body: "Message body",
        })
        .expect("Content-Type", /text\/xml/)
        .expect(200)
        .end();
    }

    function step2() {
      return agent.post("/message")
        .type("form")
        .send({
          From: "+15555555555",
          Body: "33",
        })
        .expect("Content-Type", /text\/xml/)
        .expect(200)
        .expect(function(res) {
          const doc = parseXML(res.text);

          const messageEl = find(doc.root.children, function(el) {
            return el.name === "Message";
          });

          expect(messageEl.content).to
          .contain("Have you ever jump-kicked a lemur? Type &quot;yes&quot;" +
                   " or &quot;no&quot;.");
          return;
        })
        .end();
    };

    function step3() {
      return agent.post("/message")
        .type("form")
        .send({
          From: "+15555555555",
          Body: "yes",
        })
        .expect("Content-Type", /text\/xml/)
        .expect(200)
        .expect(function(res) {
          const doc = parseXML(res.text);

          const messageEl = find(doc.root.children, function(el) {
            return el.name === "Message";
          });

          expect(messageEl.content).to
          .contain("Who is your favorite Teenage Mutant Ninja Turtle and why?");
          return;
        })
        .end();
    };

    function step4() {
      return agent.post("/message")
        .type("form")
        .send({
          From: "+15555555555",
          Body: "rafael",
        })
        .expect("Content-Type", /text\/xml/)
        .expect(200)
        .expect(function(res) {
          const doc = parseXML(res.text);

          const messageEl = find(doc.root.children, function(el) {
            return el.name === "Message";
          });

          expect(messageEl.content).to
          .contain("Thank you for taking this survey. Goodbye!");
          return;
        })
        .end();
    };

    const steps = [clearDb, step1, step2, step3, step4];

    return Promise.each(steps, function(step) {
      return step();
    });
  });

  it("Should return a goodbye after the final step in the survey.", function() {
    const response = {
      "survey":[
        {"text":"Please tell us your age.","type":"number"},
        {"text":"Have you ever jump-kicked a lemur?","type":"boolean"},
        {"text":"Who is your favorite Teenage Mutant Ninja Turtle and why?","type":"text"},
      ],
      "results":[
        {
          "phone":"+15555555555",
          "__v":3,
          "responses":[
            {"type":"number","answer":33},
            {"type":"boolean","answer":true},
            {"type":"text","answer":"rafael"},
          ],
          "complete":true,
        }
      ]
    };

    return agent.get("/results")
      .expect("Content-Type", /application\/json/)
      .expect(200)
      .expect(function(res) {
        const body = res.body;

        body.results.forEach(function(result) {
          delete result._id;
        });

        expect(body).to.deep.equal(response);
      })
      .end()
  });
});
