const { OAuth2 } = require("oauth");
const fs = require("node:fs");

const graphql_endpoint = "https://www.warcraftlogs.com/api/v2/client";

let access_token;

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
    getCharacterByName,
    connect,
    request,
    getSchema,
    getStatistics,
    getHtml
};

function ctest() {
    return new Promise((resolve) => {
        let args = [];
        request("ctest", args).then(json => {
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
        request("test", args).then(json => {
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
        request("reportByCode", args).then(json => {
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
        request("reportData", args).then(json => {
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
        request("namedDpsAndHealingPotion", args).then(json => {
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
        request("survival", args).then(json => {
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
        request("zone", args).then(json => {
            resolve(json.data.worldData.zones);
        })
    });
}

function getThirdTid(code, fid) {
    return new Promise((resolve) => {
        let args = [];
        args["code"] = code;
        args["fid"] = fid;
        request("namedMobChild", args).then(json => {
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
        request("namedMob", args).then(json => {
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
        request("character", args).then(json => {
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

function connect(client_id, client_secret) {
    return new Promise(function (resolve){
        let client = new OAuth2(client_id,
            client_secret,
            'https://www.warcraftlogs.com/',
            'oauth/authorize',
            'oauth/token',
            null);
        client.getOAuthAccessToken(
            '',
            {'grant_type': 'client_credentials'},
            function (e, token) {
                access_token = token;
                resolve(true);
            });
    });
}

function request(req_name, args) {
    return new Promise((resolve) => {
        getSchema(req_name, args).then(schema => {
            fetch(graphql_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${access_token}`,
                },
                body: JSON.stringify({
                    query: schema
                })
            }).then((res) => {
                res.json().then(json => {
                    resolve(json);
                })
            });
        })
    });
}

function getSchema(name, args) {
    return new Promise((resolve, reject) => {
        fs.readFile(`./schema/${name}.graphql`, 'utf8', async (err, data) => {
            if (err) {
                reject(err)
                return;
            }
            for(let key in args)
            {
                data = data.replaceAll("\$\{" + key + "\}", args[key])
            }
            await resolve(data);
        });
    });
}

function getStatistics(zone) {
    return new Promise((resolve, reject) => {
        fs.readFile(`./statistics/${zone}.json`, 'utf8', async (err, data) => {
            if (err) {
                reject(err)
                return;
            }
            await resolve(JSON.parse(data));
        });
    });
}

function getHtml(html) {
    return new Promise((resolve, reject) => {
        fs.readFile(`./${html}.html`, 'utf8', async (err, data) => {
            if (err) {
                reject(err)
                return;
            }
            await resolve(data);
        });
    });
}