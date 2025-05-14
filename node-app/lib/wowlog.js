require('dotenv').config();

const common = require("./common");

const WL_CLIENT_ID = process.env.CLIENT_ID;
const WL_CLIENT_SECRET = process.env.CLIENT_SECRET;

(async () => {
  await common.connect(WL_CLIENT_ID, WL_CLIENT_SECRET);
})();

module.exports = {
    ctest,
    test,
    reportByCode,
    reportData,
    namedDpsAndHealingPotion,
    getSurvival,
    getZone,
    getThirdTid,
    getNamedMob,
    getCharacterByName
};

function ctest() {
    return new Promise((resolve) => {
        let args = [];
        common.request("ctest", args).then(json => {
            try {
                resolve(json.data);
            } catch (error) {
                console.log("Error in ctest:", json);
                resolve(null);
                return;
            }
        })
    });
}

function test() {
    return new Promise((resolve) => {
        let args = [];
        common.request("test", args).then(json => {
            try {
                resolve(json.data);
            } catch (error) {
                console.log("Error in test:", json);
                resolve(null);
                return;
            }
        })
    });
}

function reportByCode(code, fids) {
    return new Promise((resolve) => {
        let args = [];
        args["code"] = code;
        args["fids"] = fids.join(",");
        common.request("reportByCode", args).then(json => {
            try {
                resolve(json.data.reportData.report);
            } catch (error) {
                console.log("Error in reportByCode:", json);
                resolve(null);
                return;
            }
        })
    });
}

function reportData(reportsQuery) {
    return new Promise((resolve) => {
        let args = [];
        args["reportsQuery"] = reportsQuery;
        common.request("reportData", args).then(json => {
            try {
                resolve(json.data.reportData);
            } catch (error) {
                console.log("Error in reportData:", json);
                resolve(null);
                return;
            }
        })
    });
}

function namedDpsAndHealingPotion(code, fids, nid, aid) {
    return new Promise((resolve) => {
        let args = [];
        args["code"] = code;
        args["fids"] = fids.join(",");
        args["nid"] = nid;
        args["aid"] = aid ? ", abilityID: " + aid : "";
        common.request("namedDpsAndHealingPotion", args).then(json => {
            try {
                resolve(json.data.reportData.report);
            } catch (error) {
                console.log("Error in namedDpsAndHealingPotion:", json);
                resolve(null);
                return;
            }
        })
    });
}

function getSurvival(code, fids, dType, nid, sid, aid) {
    return new Promise((resolve) => {
        let args = [];
        args["code"] = code;
        args["fids"] = fids.join(",");
        args["dType"] = dType;
        args["nid"] = nid;
        args["sid"] = sid;
        args["aid"] = aid;
        common.request("survival", args).then(json => {
            try {
                resolve(json.data.reportData.report);
            } catch (error) {
                console.log("Error in getSurvival:", json);
                resolve(null);
                return;
            }
        })
    });
}

function getZone() {
    return new Promise((resolve) => {
        let args = [];
        common.request("zone", args).then(json => {
            resolve(json.data.worldData.zones);
        })
    });
}

function getThirdTid(code, fid) {
    return new Promise((resolve) => {
        let args = [];
        args["code"] = code;
        args["fid"] = fid;
        common.request("namedMobChild", args).then(json => {
            try {
                resolve(json.data.reportData.report.fights[0].enemyNPCs[0].id);
            } catch (error) {
                console.log("Error in getThirdTid:", json);
                resolve(null);
                return;
            }
        })
    });
}

function getNamedMob(code, fids, tid) {
    return new Promise((resolve) => {
        let args = [];
        args["code"] = code;
        args["fids"] = fids.join(",");
        args["tid"] = tid;
        common.request("namedMob", args).then(json => {
            try {
                resolve(json.data.reportData.report);
            } catch (error) {
                console.log("Error in getNamedMob:", args, json);
                resolve(null);
                return;
            }
        })
    });
}

function getCharacterByName(name, server, region) {
    return new Promise((resolve) => {
        let args = [];
        args["name"] = name;
        args["server"] = server;
        args["region"] = region;
        // limit max 98
        common.request("character", args).then(json => {
            try {
                resolve(json.data.characterData.character);
            } catch (error) {
                console.log("Error in getCharacterByName:", json);
                resolve(null);
                return;
            }
        })
    });
}
