const promotionService = require('../services/promotion.service');

async function getAll(req, res) {
  try {
    const promotions = await promotionService.getAllPromotions();

    res.json({
      success: true,
      data: promotions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}

async function validate(req, res) {
  try {
    const result = await promotionService.validateVoucher(req.body);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}

module.exports = {
  getAll,
  validate
};