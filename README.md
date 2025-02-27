# PeopleXD Client

[![Test and Build when push to staging](https://github.com/tu-dublin-csu/peoplexd-client/actions/workflows/push-staging.yml/badge.svg)](https://github.com/tu-dublin-csu/peoplexd-client/actions/workflows/push-staging.yml)
[![Test, Build and Deploy when push to main](https://github.com/tu-dublin-csu/peoplexd-client/actions/workflows/push-main.yml/badge.svg)](https://github.com/tu-dublin-csu/peoplexd-client/actions/workflows/push-main.yml)

A TypeScript client library for interacting with the [PeopleXD API](https://documenter.getpostman.com/view/3101638/TzeTHUJE/). This client provides a convenient interface to access PeopleXD functionality including appointments, departments, and positions. The implementation is currently partial as it is "read only" and interacts only with the `/appointments` and `/reference` endpoints.

## Installation

Install the package using npm:

```bash
npm install peoplexd-client
```

## Usage

### Initialize the Client

```typescript
import { PeopleXdClient } from 'peoplexd-client'

const client = await PeopleXdClient.new(
    'https://api.corehr.com/ws/<tenant_id>/corehr/', // include your tenant id
    'your-client-id', // provided by your PeopleXD admin
    'your-client-secret' // provided by you PeopleXD admin
)
```

## Configuration Options

When initializing the PeopleXdClient, you can provide configuration options:

```typescript
interface PeopleXdClientOptions {
    titleCodeSubstitutions?: Record<string, string>
}

// Example usage:
const client = await PeopleXdClient.new('https://api.peoplexd.example.com/', 'your-client-id', 'your-client-secret', {
    titleCodeSubstitutions: {
        HPAL: 'AL' // Substitute "Hourly Paid Assistant Lecturer" with "Assistant Lecturer"
    }
})
```

### Making API Requests

```typescript
// Make a direct API request
const response = await client.request('GET', 'v1/endpoint')

// Get staff appointments (processed and cleaned)
const appointments = await client.cleanAppointments('12345')

// Get department information
const departmentName = await client.getFullDepartment('IT_DEPT')

// Get position/job title information
const jobTitle = await client.getFullJobTitle('SOFTWARE_DEV')
```

## API Documentation

### PeopleXdClient

The main client class that provides access to the PeopleXD API.

- `static async new(url: string, clientId: string, clientSecret: string): Promise<PeopleXdClient>` - Creates a new client instance
- `async request(method: string, endpoint: string, body?: any): Promise<AxiosResponse>` - Makes a direct API request
- `async cleanAppointments(staffNumber: string): Promise<ProcessedAppointment[]>` - Gets processed appointment data for a staff member
- `async getFullDepartment(deptCode: string): Promise<string>` - Gets the full department name
- `async getFullJobTitle(positionCode: string): Promise<string>` - Gets the full job title

### Data Models

#### ProcessedAppointment

```typescript
interface ProcessedAppointment {
    appointmentId: string
    primaryFlag: boolean
    jobTitle: string
    fullJobTitle: string
    department: string
    fullDepartment: string
    startDate: string
    endDate: string
}
```

## Authentication

This client handles OAuth authentication automatically. It will:

- Cache tokens locally for reuse
- Refresh tokens when they expire
- Securely store credentials

## Development

### Setup

1. Clone the repository:

    ```bash
    git clone https://github.com/tu-dublin-csu/peoplexd-client.git
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Build the project:
    ```bash
    npm run build
    ```

### Development Container

This project includes a devcontainer configuration for Visual Studio Code, which provides a consistent development environment with all necessary dependencies. In includes a sample `devcontainer.env.EXAMPLE` file which you will need to rename `devcontainer.env` and populate with required values for your PeopleXD tenancy.

```
PEOPLEXD_URL=https://api.corehr.com/ws/<your_tenant_id>/corehr/
PRODUCTION_PXD_SECRET=<your_secret>
PRODUCTION_PXD_ID=<your_id>
TEST_STAFF_ID=12345 # used in dummy_proj/main.js
```

**Note:** the Staging URL will be diferent - see the PeopleXD documentation for details.

A simple script allows you to test against your PeopleXD instance

```
node ./dummy_proj/main.js
```

### Testing

Run tests with:

```bash
npm run test
```

The project uses Jest for testing with TypeScript support.

### Linting and Formatting

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributors

- Cian McGovern
- Eoin Kilfeather

---

© 2025 tu-dublin-csu
