import { decodeHtml, log, LogType } from '../src/Utilities'
import { decode } from 'html-entities'

// Mock the html-entities package
jest.mock('html-entities', () => ({
    decode: jest.fn()
}))

describe('Utilities', () => {
    describe('decodeHtml', () => {
        beforeEach(() => {
            // Clear mock calls before each test
            jest.clearAllMocks()

            // Set up the mock to pass through the input by default
            ;(decode as jest.Mock).mockImplementation((text) => text)
        })

        it('should call the decode function from html-entities', () => {
            const text = 'Test &amp; example'
            decodeHtml(text)

            expect(decode).toHaveBeenCalledWith(text)
            expect(decode).toHaveBeenCalledTimes(1)
        })

        it('should return the decoded string', () => {
            const input = 'This &amp; that'
            const expected = 'This & that'

            ;(decode as jest.Mock).mockReturnValue(expected)

            const result = decodeHtml(input)

            expect(result).toBe(expected)
        })

        it('should handle empty strings', () => {
            const input = ''
            const result = decodeHtml(input)

            expect(decode).toHaveBeenCalledWith('')
            expect(result).toBe('')
        })

        it('should handle strings without HTML entities', () => {
            const input = 'Plain text without entities'

            decodeHtml(input)

            expect(decode).toHaveBeenCalledWith(input)
        })
    })
    describe('log function', () => {
        beforeEach(() => {
            // Clear all mocks before each test
            jest.clearAllMocks()
            process.env.PXD_NODE_ENV = 'DEVELOPMENT' // Set environment variable for testing
        })

        afterEach(() => {
            delete process.env.PXD_NODE_ENV // Clean up after tests
        })

        it('should log log messages in development environment', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

            log(LogType.LOG, 'Test log message')

            expect(consoleSpy).toHaveBeenCalledWith('Test log message')
            consoleSpy.mockRestore()
        });

        it('should log warn messages in development environment', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

            log(LogType.WARN, 'Test warn message')

            expect(consoleSpy).toHaveBeenCalledWith('Test warn message')
            consoleSpy.mockRestore()
        });

        it('should log error messages in development environment', () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

            log(LogType.ERROR, 'Test error message')

            expect(consoleSpy).toHaveBeenCalledWith('Test error message')
            consoleSpy.mockRestore()
        });

        it('should log debug messages in development environment', () => {
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation()

            log(LogType.DEBUG, 'Test debug message')

            expect(consoleSpy).toHaveBeenCalledWith('Test debug message')
            consoleSpy.mockRestore()
        });

        it('should not log messages if PXD_NODE_ENV is not set', () => {
            delete process.env.PXD_NODE_ENV; // Remove the environment variable

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            log(LogType.LOG, 'This should not be logged');

            expect(consoleSpy).not.toHaveBeenCalled();
            consoleSpy.mockRestore();
        });

        it('should throw an error for unknown log types', () => {
            expect(() => {
                log('UNKNOWN' as LogType, 'This should throw an error');
            }).toThrow('Unknown log type: UNKNOWN');
        });
    })
})
