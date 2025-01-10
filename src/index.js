import { PeopleXdClient } from './PeopleXdClient.js';

console.log(`PeopleXD Client Starting...`);

const client = new PeopleXdClient(process.env.PEOPLEXD_URL, process.env.PEOPLEXD_ID, process.env.PEOPLEXD_SECRET, true);
console.log(`PeopleXD Client created with URL: ${client.url}    ID: ${client.clientId}    Secret: ${client.clientSecret}   Use Cache: ${client.useCache}`);
const staffNumber = '058279';

async function deptHistory() {
    try {
        const resp = await client.appointments(staffNumber);
        console.log(`Appointments for ${staffNumber}: ${JSON.stringify(resp, null, 2)}`);
    } catch (e) {
        console.error(`Error fetching appointments for ${staffNumber}: ${e.message}`);
    }
}

async function deptInfo() {
    try {
        const resp = await client.department('RE02');
        console.log(`Department CARE: ${JSON.stringify(resp, null, 2)}`);
    } catch (e) {
        console.error(`Error fetching department CARE: ${e.message}`);
    }
}

deptHistory();
deptInfo();