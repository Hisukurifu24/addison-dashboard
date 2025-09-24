import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
	title: 'Addison Care Dashboard v3.0',
	description: 'Advanced management system for Addison\'s disease treatment',
}

export default function RootLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<html lang="it">
			<body className={inter.className}>{children}</body>
		</html>
	)
}