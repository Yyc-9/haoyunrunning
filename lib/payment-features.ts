export function isShopCardPaymentEnabled(environment: NodeJS.ProcessEnv = process.env) {
  return environment.SHOP_CARD_PAYMENTS_ENABLED?.trim().toLowerCase() === 'true'
    && Boolean(environment.STRIPE_SECRET_KEY?.trim())
    && Boolean(environment.STRIPE_WEBHOOK_SECRET?.trim())
}
