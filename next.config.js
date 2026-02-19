/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

module.exports = withNextIntl(nextConfig)

