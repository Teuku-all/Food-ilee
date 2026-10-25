const aiService = require('../services/ai.service');

async function askAI(req, res) {
  try {
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message wajib diisi',
      });
    }

    const response = await aiService.askAI(message, req.body.language);

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

async function recommendWaste(req, res) {
  try {
    const { title, description } = req.body;

    const response = await aiService.recommendWaste(title, description, req.body.language);

    // Bersihkan response AI
    const cleanResponse = response
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    res.status(200).json({
      success: true,

      data: JSON.parse(cleanResponse),
    });
  } catch (error) {
    res.status(500).json({
      success: false,

      message: error.message,
    });
  }
}

module.exports = {
  askAI,
  recommendWaste,
};
