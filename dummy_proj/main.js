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
    const appointments = await client.cleanAppointments(process.env.TEST_STAFF_ID)

    console.log(appointments)
} catch (error) {
    console.error('An error occurred:', error.data)
}
