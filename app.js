const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertstate = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};
const convertDistrict = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getstates = `
    SELECT
    *
    FROM
    state;`;
  const getArray = await database.all(getstates);
  response.send(getArray.map((eachstate) => convertstate(eachstate)));
  console.log(getArray);
});

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const getstate = `
    SELECT
    *
    FROM
    state
    WHERE
    state_id = ${stateId};`;
  const getArray = await database.get(getstate);
  response.send(convertstate(getArray));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const postdistQ = `
    INSERT INTO
    district (district_name, state_id, cases, cured, active, deaths)
    VALUES
    (${districtName}, ${stateId}, ${cases}, ${cured}, ${active}, ${deaths};`;
  const district = await database.run(postdistQ);
  response.send("District Successfully Added");
});

app.get("/districts/:districtId", async (request, response) => {
  const { districtId } = request.params;
  const getdistQ = `
    SELECT
    *
    FROM
    district
    WHERE
    district_id = ${districtId};`;
  const dist = await database.get(getdistQ);
  response.send(convertDistrict(dist));
});

app.delete("districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deletedistQ = `
    DELETE FROM
    district
    WHERE
    district_id = ${districtId};`;
  await database.run(deletedistQ);
  response.send("District Removed");
});

app.put("districts/:districtId/", async (request, reponse) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const districtId = request.params;
  const updatedQ = `
    UPDATE
    district
    SET
      district_name = ${districtName},
      state_id = ${stateId},
      cases = ${cases},
      cured = ${cured},
      active = ${active},
      deaths = ${deaths}
    WHERE
      district_id = ${districtId};`;
  await database.run(updatedQ);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getstateQuery = `
    SELECT SUM(cases), SUM(cured), SUM(active), SUM(deaths)
    FROM 
    district
    WHERE
    state_id = ${stateId};`;
  const s = await database.get(getstateQuery);
  response.send({
    totalCases: s["SUM(cases)"],
    totalCured: s["SUM(cured)"],
    totalActive: s["SUM(active)"],
    totalDeaths: s["SUM(deaths)"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateQuery = `
    SELECT 
    state_name
    FROM
    district
    NATURAL JOIN state
    WHERE
    district_id = ${districtId};`;
  const statename = await database.get(getStateQuery);
  response.send({ stateName: statename.state_name });
});

module.exports = app;
