const { OAuth2 } = require("oauth");
const fs = require("node:fs");

const graphql_endpoint = "https://www.warcraftlogs.com/api/v2/client";

let access_token;

module.exports = {
  connect,
  request,
  getSchema,
  getStatistics,
  getHtml
}

async function connect(client_id, client_secret) {
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