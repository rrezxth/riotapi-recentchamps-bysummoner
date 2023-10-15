// ---------- Import module ----------
const axios = require('axios');
const readline = require('readline');
   
const apiKey = 'YOUR-API-KEY';

// ---------- Construct API Functions ----------
function getPuuidAPI(region, summonerName) {
    return `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=${apiKey}`;
}

function getMatchesAPI(continent, numberOfMatches, puuid) {
    return `https://${continent}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${numberOfMatches}&api_key=${apiKey}`;
}

function getMatchAPI(matchid) {
    return `https://americas.api.riotgames.com/lol/match/v5/matches/${matchid}?api_key=${apiKey}`;
}

// Read interface
let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter the region (e.g., na1): ', (region) => {
    rl.question('Enter the Summoner\'s name: ', (summonerName) => {

        const pid_endpoint = getPuuidAPI(region, summonerName);
        let myPid;
        const matchIdsArray = [];
        const championArray = [];

        // ---------- API calls ----------
        // Fetch summoner data
        axios.get(pid_endpoint)
            .then(response => {
                //console.log('Summoner PUUID -- ', response.data.puuid);
                myPid = response.data.puuid;

                const matches_endpoint = getMatchesAPI("americas", 15, myPid);

                // Fetch match IDs
                return axios.get(matches_endpoint);
            })
            .then(response => {
                const matchIds = response.data;

                // Push each match ID into the matchIdsArray
                matchIds.forEach(matchId => {
                    matchIdsArray.push(matchId);
                });

                let matchFetchPromises = [];

                // Fetch match data for each match ID
                for (let i = 0; i < matchIdsArray.length; i++) {
                    const matchEndpoint = getMatchAPI(matchIdsArray[i]);
                    matchFetchPromises.push(axios.get(matchEndpoint));
                }

                // Execute all match fetch promises
                return Promise.all(matchFetchPromises);
            })
            .then(responses => {
                // Process match data
                responses.forEach(response => {
                    const participants = response.data.info.participants;

                    // Loop through the participants
                    for (let i = 0; i < participants.length; i++) {
                        const player = participants[i].summonerName;

                        if (player.toLowerCase() === summonerName.toLowerCase()) {
                            //console.log(`${player} was playing: ${participants[i].championName}`);
                            championArray.push(participants[i].championName);
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching data:', error);
            })
            .finally(() => {
                // Process and print championArray after fetching all match data
                if (championArray.length > 0) {
                    //console.log('\n\n** Processing champions **\n');

                    const championCounts = {};

                    // Count occurrences of each champion
                    for (const champion of championArray) {
                    if (championCounts[champion]) {
                        championCounts[champion]++;
                    } else {
                        championCounts[champion] = 1;
                    }
                    }

                    console.log('\nIn the recent 15 games...\n');
                    // Output the counts
                    for (const champion in championCounts) {
                    console.log(`${champion}`, ' was played ',  `${championCounts[champion]}`, ' time/s.');
}
                } else {
                    console.log('No champions found for the summoner.');
                }

                // Close readline interface
                rl.close();
            });
    });
});
