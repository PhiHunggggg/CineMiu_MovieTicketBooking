const promotionRepository = require('../repositories/promotion.repository');

async function getAllPromotions() {
  return await promotionRepository.getAll();
}

async function validateVoucher(request) {
  const { promoCode, orderAmount, userId } = request;

  if (!promoCode) {
    throw new Error('Vui lòng nhập mã voucher');
  }

  if (!orderAmount || orderAmount <= 0) {
    throw new Error('Tổng tiền đơn hàng không hợp lệ');
  }

  const promotion = await promotionRepository.getByCode(promoCode);

  const now = new Date();

  if (!promotion || !promotion.is_active) {
    throw new Error('Voucher không tồn tại hoặc đã hết hạn');
  }

  if (new Date(promotion.valid_from) > now || new Date(promotion.valid_to) < now) {
    throw new Error('Voucher không còn trong thời gian sử dụng');
  }

  if (orderAmount < promotion.min_order_amt) {
    throw new Error(`Đơn hàng tối thiểu ${promotion.min_order_amt}đ để dùng voucher này`);
  }

  if (promotion.usage_limit && promotion.total_uses >= promotion.usage_limit) {
    throw new Error('Voucher đã hết lượt sử dụng');
  }

  if (userId && userId > 0) {
    const userUses = await promotionRepository.countUserUses(promotion.promo_id, userId);

    if (userUses >= promotion.per_user_limit) {
      throw new Error('Bạn đã sử dụng hết số lượt của voucher này');
    }
  }

  let discountAmount = 0;

  if (promotion.discount_type === 'percent') {
    discountAmount = orderAmount * promotion.discount_value / 100;
  } else {
    discountAmount = promotion.discount_value;
  }

  if (promotion.max_discount && discountAmount > promotion.max_discount) {
    discountAmount = promotion.max_discount;
  }

  if (discountAmount > orderAmount) {
    discountAmount = orderAmount;
  }

  return {
    promotion,
    discountAmount,
    finalAmount: orderAmount - discountAmount
  };
}

module.exports = {
  getAllPromotions,
  validateVoucher
};