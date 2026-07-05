const express = require("express");
const router = express.Router();
const promotionController = require("../controllers/promotion.controller");

router.get('/', promotionController.getAll);
router.post('/validate', promotionController.validate);

module.exports = router;