import { PeopleXdClient } from '../dist/index.js'

console.log(process.env.PEOPLEXD_URL)

try {
    const defaultOptions = {
        titleCodeSubstitutions: {
            HPAL: 'AL'
        }
    }
    const client = await PeopleXdClient.new(
        process.env.PEOPLEXD_URL,
        process.env.PRODUCTION_PXD_ID,
        process.env.PRODUCTION_PXD_SECRET,
        defaultOptions
    )

    console.log(client.getOptions())

    const staffIDFail = '123456'; // Example staff ID that might not exist
    const appointments = await client.cleanAppointments(staffIDFail)

    console.log(appointments)
} catch (error) {
    console.error('An error occurred:', error.data)
}
