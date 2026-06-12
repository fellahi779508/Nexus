"use client";

import { useParams } from "next/navigation";

export default function CategoryPage() {
	const params = useParams();
	return (
		<div>
			<h1>Category Page</h1>
			<p>Category ID: {params?.categoryId}</p>
		</div>
	);
}
