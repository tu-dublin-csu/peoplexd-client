import { decodeHtml } from '../src/Utilities';
import { decode } from 'html-entities';

// Mock the html-entities package
jest.mock('html-entities', () => ({
  decode: jest.fn()
}));

describe('Utilities', () => {
  describe('decodeHtml', () => {
    beforeEach(() => {
      // Clear mock calls before each test
      jest.clearAllMocks();
      
      // Set up the mock to pass through the input by default
      (decode as jest.Mock).mockImplementation((text) => text);
    });

    it('should call the decode function from html-entities', () => {
      const text = 'Test &amp; example';
      decodeHtml(text);
      
      expect(decode).toHaveBeenCalledWith(text);
      expect(decode).toHaveBeenCalledTimes(1);
    });

    it('should return the decoded string', () => {
      const input = 'This &amp; that';
      const expected = 'This & that';
      
      (decode as jest.Mock).mockReturnValue(expected);
      
      const result = decodeHtml(input);
      
      expect(result).toBe(expected);
    });

    it('should handle empty strings', () => {
      const input = '';
      const result = decodeHtml(input);
      
      expect(decode).toHaveBeenCalledWith('');
      expect(result).toBe('');
    });

    it('should handle strings without HTML entities', () => {
      const input = 'Plain text without entities';
      
      decodeHtml(input);
      
      expect(decode).toHaveBeenCalledWith(input);
    });
  });
});