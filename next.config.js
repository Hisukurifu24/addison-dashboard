/** @type {import('next').NextConfig} */
const nextConfig = {
	// App Directory is now stable in Next.js 14
	output: 'standalone', // For Docker deployments
	// output: 'export', // Uncomment for static export to CDN/GitHub Pages
	images: {
		unoptimized: true // Required for static export
	}
}

module.exports = nextConfig