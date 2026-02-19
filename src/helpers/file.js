const { extractText: parsePdf } = require('unpdf');
const mammoth = require('mammoth');

const extractText = async (file) => {
  const { mimetype, buffer } = file;

  try {
    if (mimetype === 'application/pdf') {
      const uint8Array = new Uint8Array(buffer);
      const text = await parsePdf(uint8Array);
      return typeof text === 'string' ? text : text.text;
    }

    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const data = await mammoth.extractRawText({ buffer });
      return data.value;
    }

    if (mimetype === 'text/plain') {
      return buffer.toString('utf8');
    }

    throw new Error(`Unsupported file format: ${mimetype}`);
  } catch (error) {
    console.error("Extraction Error:", error);
    throw new Error(`Failed to extract text from document: ${error.message}`);
  }
};

module.exports = extractText;